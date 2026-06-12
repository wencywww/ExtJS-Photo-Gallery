<?php
// =====================================================================================
// SQLite gallery index (2026-06)
//
// Optional read-acceleration index over app/data/photos. One row per REAL file
// (thumbs are derived, not indexed). Read path is used when the request carries
// useIndex=true AND pdo_sqlite is loaded AND the db file exists; otherwise callers
// silently fall back to the legacy Symfony Finder scanning.
//
// Write hooks (giUpsertFile/giMoveFile/giUpdateGps/giDeleteFile) are called by the
// mutating actions in processUploads.php REGARDLESS of the useIndex preference, so
// the index stays fresh even while reads are toggled off. All hooks are silent
// no-ops when the db is missing and swallow their own errors — an index problem
// must never break a file operation.
//
// The index can always be rebuilt from the filesystem (targetAction=rebuildIndex);
// it holds no primary data.
// =====================================================================================

use Symfony\Component\Finder\Finder;

// Full filesystem path of the SQLite db file
function giDbFile()
{
    global $glob;
    return $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['galleryIndexFileName'];
}

// Memoized PDO connection; null on any failure. Bootstraps the schema when $create=true.
function giConnect($create = false)
{
    static $pdo = null;
    static $failed = false;

    if ($pdo !== null) {
        return $pdo;
    }
    if ($failed) {
        return null;
    }
    if (!extension_loaded('pdo_sqlite')) {
        $failed = true;
        return null;
    }
    if (!$create && !file_exists(giDbFile())) {
        return null; // not a hard failure — db may be created later
    }

    try {
        $pdo = new PDO('sqlite:' . giDbFile());
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('PRAGMA journal_mode=WAL');
        $pdo->exec('PRAGMA busy_timeout=5000');
        $pdo->exec('PRAGMA synchronous=NORMAL');
        $pdo->exec('CREATE TABLE IF NOT EXISTS files (
            day      TEXT    NOT NULL,
            filename TEXT    NOT NULL COLLATE NOCASE,
            fileType TEXT    NOT NULL,
            mtime    INTEGER NOT NULL,
            hasGps   INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (day, filename)
        )');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_day ON files(day)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');
        $pdo->exec("INSERT OR IGNORE INTO meta (key, value) VALUES ('schemaVersion', '1')");
        return $pdo;
    } catch (Throwable $e) {
        $pdo = null;
        $failed = true;
        return null;
    }
}

function giAvailable()
{
    return extension_loaded('pdo_sqlite') && file_exists(giDbFile());
}

// True when the request asked for the index AND it is usable
function giReadEnabled()
{
    global $useIndex;
    return $useIndex && giAvailable();
}

// Converts a web dir path ('/data/photos/2020/05/14', possibly with appRootPrefix)
// to the index 'day' value ('2020/05/14'). Returns null when the prefix does not match.
function giDayFromWebPath($webDirPath)
{
    global $glob;
    $prefix = $glob['paths']['photosDir'] . '/';
    $webDirPath = str_replace('\\', '/', $webDirPath);
    if (strpos($webDirPath, $prefix) !== 0) {
        return null;
    }
    return substr($webDirPath, strlen($prefix));
}

// Escapes LIKE wildcards; used together with ESCAPE '\' in the SQL
function giEscapeLike($s)
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $s);
}

// Shared WHERE fragments for fileType + nameFilter. Appends bind values to $bind.
function giFilterSql(array &$bind)
{
    global $showPhotos, $showVideos, $nameFilter, $nameFilterNegate;

    $sql = '';
    if ($showPhotos && !$showVideos) {
        $sql .= " AND fileType = 'photo'";
    } elseif ($showVideos && !$showPhotos) {
        $sql .= " AND fileType = 'video'";
    }
    if ($nameFilter !== '') {
        $op = $nameFilterNegate ? 'NOT LIKE' : 'LIKE';
        $sql .= " AND filename $op ? ESCAPE '\\'";
        $bind[] = '%' . giEscapeLike($nameFilter) . '%';
    }
    return $sql;
}

// ============================== Write hooks ==============================

function giUpsertFile($day, $filename, $fileType, $mtime, $hasGps)
{
    try {
        $pdo = giConnect();
        if (!$pdo) return;
        $pdo->prepare('INSERT OR REPLACE INTO files (day, filename, fileType, mtime, hasGps) VALUES (?,?,?,?,?)')
            ->execute([$day, $filename, $fileType, (int)$mtime, (int)$hasGps]);
    } catch (Throwable $e) { /* index must never break a file operation */ }
}

function giMoveFile($oldDay, $filename, $newDay, $newMtime)
{
    if ($oldDay === null) return;
    try {
        $pdo = giConnect();
        if (!$pdo) return;
        // OR REPLACE: a filesystem rename() silently overwrites a same-named file in the target day
        $pdo->prepare('UPDATE OR REPLACE files SET day = ?, mtime = ? WHERE day = ? AND filename = ?')
            ->execute([$newDay, (int)$newMtime, $oldDay, $filename]);
    } catch (Throwable $e) { }
}

function giUpdateGps($day, $filename, $hasGps)
{
    if ($day === null) return;
    try {
        $pdo = giConnect();
        if (!$pdo) return;
        $pdo->prepare('UPDATE files SET hasGps = ? WHERE day = ? AND filename = ?')
            ->execute([(int)$hasGps, $day, $filename]);
    } catch (Throwable $e) { }
}

function giDeleteFile($day, $filename)
{
    if ($day === null) return;
    try {
        $pdo = giConnect();
        if (!$pdo) return;
        $pdo->prepare('DELETE FROM files WHERE day = ? AND filename = ?')
            ->execute([$day, $filename]);
    } catch (Throwable $e) { }
}

// ============================== Rebuild ==============================

// Full rebuild from the filesystem. Iterates THUMB files (a row = what the gallery can
// display), derives the real file, reads GPS presence from EXIF (photos only).
// One big transaction — WAL readers keep seeing the previous snapshot until commit.
function giRebuildIndex()
{
    global $photosDir, $videoPattern;

    set_time_limit(0);
    $t0 = microtime(true);

    $pdo = giConnect(true); // creates db + schema if missing
    if (!$pdo) {
        return ['count' => 0, 'duration' => 0, 'error' => 'pdo_sqlite unavailable'];
    }

    $count = 0;
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM files');
        $ins = $pdo->prepare('INSERT OR REPLACE INTO files (day, filename, fileType, mtime, hasGps) VALUES (?,?,?,?,?)');

        $finder = new Finder();
        $finder->files()->name('*.thumb.*')->in($photosDir);
        foreach ($finder as $file) {
            $day = str_replace('\\', '/', $file->getRelativePath()); // 'YYYY/MM/DD'
            $thumbFilename = $file->getFilename();
            $realName = substr($thumbFilename, 0, mb_stripos($thumbFilename, '.thumb.'));
            $realPath = "$photosDir/$day/$realName";
            if ($realName === '' || !is_file($realPath)) {
                continue; // orphan thumb
            }
            // EXACT legacy fileType expression (see getPhotos) so index/legacy never disagree
            $fileType = (preg_match($videoPattern, str_replace('.thumb.jpg', '', $thumbFilename))) ? ('video') : ('photo');
            $hasGps = 0;
            if ($fileType === 'photo') {
                $exif = @exif_read_data($realPath);
                if (isset($exif['GPSLatitude']) && isset($exif['GPSLongitude'])) { // EXACT gpsDataExists() test
                    $hasGps = 1;
                }
            }
            $ins->execute([$day, $realName, $fileType, filemtime($realPath), $hasGps]);
            $count++;
        }

        $pdo->prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastRebuild', ?)")
            ->execute([date('c')]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['count' => 0, 'duration' => round(microtime(true) - $t0, 1), 'error' => $e->getMessage()];
    }

    return ['count' => $count, 'duration' => round(microtime(true) - $t0, 1)];
}

// ============================== Read path ==============================
// All read functions return null on any error → callers fall back to the legacy Finder path.

// Maps a db row to the item shape produced by the legacy getPhotos() loop
function giRowToItem(array $row)
{
    global $glob;

    $dateStr = date('Y-m-d', (int)$row['mtime']); // same derivation as legacy filemtime-based caption
    $ext = pathinfo($row['filename'], PATHINFO_EXTENSION);
    $thumbName = $row['filename'] . '.thumb.' . ($row['fileType'] === 'video' ? 'jpg' : $ext);
    $uriBase = $glob['paths']['photosDir'] . '/' . $row['day'] . '/';

    $item = [
        'thumbUri' => $uriBase . $thumbName,
        'caption'  => "$dateStr / {$row['filename']}",
        'realUri'  => $uriBase . $row['filename'],
        'date'     => $dateStr,
        'fileType' => $row['fileType'],
    ];
    // gpsData from the indexed column — replaces the per-file exif_read_data of gpsDataExists()
    if ($row['fileType'] === 'photo' && (int)$row['hasGps'] === 1) {
        $item['gpsData'] = 1;
    }
    return $item;
}

function giGetPhotos($req)
{
    global $paginateData;

    $pdo = giConnect();
    if (!$pdo) return null;

    try {
        $bind = [];
        if (!empty($req['paths'])) {
            // Lazy mode: explicit list of Day paths
            $pathList = json_decode($req['paths'], true);
            if (!is_array($pathList) || count($pathList) === 0) {
                return ['data' => [], 'total' => 0];
            }
            $days = array_map(function ($p) { return str_replace('\\', '/', $p); }, $pathList);
            $where = 'day IN (' . implode(',', array_fill(0, count($days), '?')) . ')';
            $bind = $days;
        } else {
            // Single path: '' (all), 'YYYY', 'YYYY/MM' or 'YYYY/MM/DD' — prefix match is safe
            // because day segments are fixed-width ('2020/05' can never prefix '2020/051')
            $path = isset($req['path']) ? str_replace('\\', '/', trim($req['path'], '/')) : '';
            if ($path === '') {
                $where = '1=1';
            } else {
                $where = "(day = ? OR day LIKE ? || '/%')";
                $bind = [$path, $path];
            }
        }

        $where .= giFilterSql($bind);

        // Sort parity with the legacy array_multisort(date, caption): day mirrors date('Y-m-d', mtime)
        // (an invariant every app mutation maintains), filename COLLATE BINARY mirrors PHP's
        // case-sensitive caption comparison (the column itself is NOCASE).
        $dir = (isset($req['photosSort']) && $req['photosSort'] === 'ASC') ? 'ASC' : 'DESC';
        $sql = "SELECT day, filename, fileType, mtime, hasGps FROM files WHERE $where
                ORDER BY day $dir, filename COLLATE BINARY $dir";

        $total = null;
        if ($paginateData) {
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM files WHERE $where");
            $cnt->execute($bind);
            $total = (int)$cnt->fetchColumn();
            $sql .= ' LIMIT ' . (int)($req['limit'] ?? 20) . ' OFFSET ' . (int)($req['start'] ?? 0);
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);

        $arr = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $arr[] = giRowToItem($row);
        }

        return ['data' => $arr, 'total' => ($total !== null) ? $total : count($arr)];
    } catch (Throwable $e) {
        return null;
    }
}

function giGetTreeLevel($nodePath)
{
    global $nameFilter;

    $pdo = giConnect();
    if (!$pdo) return null;

    try {
        $depth = ($nodePath === '') ? 0 : substr_count($nodePath, '/') + 1;
        $nodes = [];

        if ($depth < 2) { // years (depth 0) or months (depth 1)
            $substr = ($depth === 0) ? 'substr(day, 1, 4)' : 'substr(day, 6, 2)';
            $bind = [];
            $where = '1=1';
            if ($nodePath !== '') {
                $where = "day LIKE ? || '/%'";
                $bind[] = $nodePath;
            }
            // Parity with legacy: the type/name filters narrow the listing ONLY when a
            // name filter is active (legacy lists all existing dirs otherwise; its empty-branch
            // skip check is nameFilter-gated)
            if ($nameFilter !== '') {
                $where .= giFilterSql($bind);
            }
            $stmt = $pdo->prepare("SELECT DISTINCT $substr AS seg FROM files WHERE $where ORDER BY seg");
            $stmt->execute($bind);

            $iconCls = ($depth === 0) ? 'fas fa-calendar' : 'fas fa-calendar-alt';
            while (($seg = $stmt->fetchColumn()) !== false) {
                $nodes[] = [
                    'leaf'       => false,
                    'expandable' => true,
                    'expanded'   => false,
                    'text'       => $seg,
                    'path'       => ($nodePath === '') ? $seg : "$nodePath/$seg",
                    'iconCls'    => $iconCls,
                ];
            }
        } else { // days — always type+name filtered, zero-count days naturally absent (GROUP BY)
            $bind = [$nodePath];
            $where = "day LIKE ? || '/%'" . giFilterSql($bind);
            $stmt = $pdo->prepare("SELECT day, COUNT(*) AS items FROM files WHERE $where GROUP BY day ORDER BY day");
            $stmt->execute($bind);

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $nodes[] = [
                    'leaf'     => true,
                    'text'     => substr($row['day'], 8, 2),
                    'path'     => $row['day'],
                    'nodeType' => 'Day',
                    'iconCls'  => 'fas fa-calendar-check',
                    'items'    => (int)$row['items'],
                ];
            }
        }

        return $nodes;
    } catch (Throwable $e) {
        return null;
    }
}

function giGenerateDirStruct()
{
    $pdo = giConnect();
    if (!$pdo) return null;

    try {
        // Always filtered — legacy adjustTree+cleanEmptyNodes prune zero-count days
        // and empty months/years anyway, so GROUP BY produces the already-clean tree
        $bind = [];
        $where = '1=1' . giFilterSql($bind);
        $stmt = $pdo->prepare("SELECT day, COUNT(*) AS items FROM files WHERE $where GROUP BY day ORDER BY day");
        $stmt->execute($bind);

        // Nested year → month → day structure mirroring adjustTree() output
        $years = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            list($y, $m, $d) = explode('/', $row['day']);
            if (!isset($years[$y])) {
                $years[$y] = ['leaf' => false, 'expanded' => true, 'text' => $y, 'path' => $y,
                              'RECORDS' => [], 'iconCls' => 'fas fa-calendar'];
            }
            if (!isset($years[$y]['RECORDS'][$m])) {
                $years[$y]['RECORDS'][$m] = ['leaf' => false, 'expanded' => true, 'text' => $m, 'path' => "$y/$m",
                                             'RECORDS' => [], 'iconCls' => 'fas fa-calendar-alt'];
            }
            $years[$y]['RECORDS'][$m]['RECORDS'][] = [
                'leaf' => true, 'text' => $d, 'path' => $row['day'],
                'nodeType' => 'Day', 'iconCls' => 'fas fa-calendar-check', 'items' => (int)$row['items'],
            ];
        }

        // Re-index month/year maps to plain arrays (the frontend expects lists)
        $out = [];
        foreach ($years as $yearNode) {
            $yearNode['RECORDS'] = array_values($yearNode['RECORDS']);
            $out[] = $yearNode;
        }
        return $out;
    } catch (Throwable $e) {
        return null;
    }
}
