<?php

//require($_SERVER['DOCUMENT_ROOT'] . "/inc/globals/globals.inc.php");
require("../../../../inc/globals/globals.inc.php");

$uploadsDir = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['uploadDir'];
$photosDir = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['photosDir'];
$thumbTemplatesDir = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['thumbTemplateDir'];
$diskStatusFileName = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['diskStatusFileName'];


//require symfony (and not only) stuff
//require($_SERVER['DOCUMENT_ROOT'] . "/libraries/php/SymfonyComponents/vendor/autoload.php");
require($glob['paths']['appRootPathAbsolute'] . "/libraries/php/SymfonyComponents/vendor/autoload.php");

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Filesystem\Exception\IOExceptionInterface;

$fileSystem = new Filesystem();

use Symfony\Component\Finder\Finder;

$finder = new Finder();

use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Constraints\Image;

$validator = Validation::createValidator();

//exif reader from https://packagist.org/packages/miljar/php-exif
$exifReader = \PHPExif\Reader\Reader::factory(\PHPExif\Reader\Reader::TYPE_NATIVE);

use Imagine\Image\Box;
use Imagine\Image\Point;
use Imagine\Image\Metadata;
use Imagine\Image\Metadata\ExifMetadataReader;
use Imagine\Filter\Basic;

use lsolesen\pel\PelJpeg;
use lsolesen\pel\PelTiff;
use lsolesen\pel\PelIfd;
use lsolesen\pel\PelDataWindow;


$imgPattern = '([^\s]+(\.(?i)(jpg|jpeg|png|gif|bmp|mp4|avi|mov|ogg|mkv))$)';
$videoPattern = '([^\s]+(\.(?i)(mp4|avi|mov|ogg))$)';

$targetAction = $_REQUEST['targetAction'];

switch ($targetAction) {

    case 'ping':
        $status = respondToPing();
        header("Content-type: application/json");
        print json_encode(['success' => true, 'details' => $status]);
        die();
        break;
    case 'processUploads':
        set_time_limit(0);
        processUploads();
        removeEmptyDirs($uploadsDir);
        header("Content-type: application/json");
        print json_encode(['success' => true]);
        $fileSystem->remove($diskStatusFileName);
        die();
        break;
    case 'generateDirStruct':
        $navTree = generateDirStruct();
        header("Content-type: application/json");
        print json_encode(['success' => true, 'RECORDS' => $navTree]);
        die();
        break;
    case 'getPhotos':
        $photos = getPhotos($_REQUEST);
        header("Content-type: application/json");
        print json_encode(['success' => true, 'RECORDS' => $photos]);
        die();
        break;
    case 'changePhotoDates':
        changePhotoDates();
        header("Content-type: application/json");
        print json_encode(['success' => true]);
        $fileSystem->remove($diskStatusFileName);
        die();
        break;
    case 'rotatePhotos':
        rotatePhotos();
        header("Content-type: application/json");
        print json_encode(['success' => true]);
        $fileSystem->remove($diskStatusFileName);
        die();
        break;
    case 'deletePhotos':
        deletePhotos();
        header("Content-type: application/json");
        print json_encode(['success' => true]);
        $fileSystem->remove($diskStatusFileName);
        die();
        break;
    default:
        break;
}


function respondToPing()
{
    global $fileSystem, $finder, $uploadsDir, $photosDir, $imgPattern, $diskStatusFileName;

    $finder = new Finder();
    $res = $finder->files()->name($imgPattern)->in($uploadsDir);
    unset($finder);

    $arr = [];
    if ($res->hasResults()) {
        $arr['status'] = true;
        $arr['count'] = $res->count();
    } else {
        $arr['status'] = false;
    }

    //return $arr;

    if ($fileSystem->exists($diskStatusFileName)) {
        $arr['diskStatus'] = json_decode(file_get_contents($diskStatusFileName));
        $arr['test'] = true; //simply report that data is from the cache
    } else {
        $finder = new Finder();
        $res = $finder->files()->name($imgPattern)->in($photosDir);
        unset($finder);
        $diskTotalSpace = FileSizeConvert(disk_total_space($photosDir));
        $diskFreeSpace = FileSizeConvert(disk_free_space($photosDir));
        $diskFreeSpacePercent = (disk_free_space($photosDir) / disk_total_space($photosDir)) * 100;
        $diskFreeSpacePercent = number_format($diskFreeSpacePercent, 2, '.', '') . '%';
        $photosDirSize = FileSizeConvert(getDirectorySize($photosDir));

        $arr['diskStatus'] = (object)['filesCount' => $res->count() / 2, 'totalSize' => $photosDirSize, 'diskFreeSpace' => $diskFreeSpace, 'diskTotalSpace' => $diskTotalSpace, 'freePercent' => $diskFreeSpacePercent];
        //print $diskStatusFileName;
        file_put_contents($diskStatusFileName, json_encode($arr['diskStatus']));
    }

    return $arr;


}

function processUploads()
{
    global $fileSystem, $finder, $validator, $uploadsDir, $photosDir, $thumbTemplatesDir, $imgPattern, $videoPattern;

    //execute the actual find
    $finder->files()->name($imgPattern)->in($uploadsDir);

    if ($finder->hasResults()) {

        $imagine = new Imagine\Gd\Imagine();
        $autorotate = new Basic\Autorotate();

        foreach ($finder as $file) {

            $isVideo = false;

            //check for video file
            if (preg_match($videoPattern, $file->getFilename())) {
                $isVideo = true;
            }

            $fileName = $file->getRealPath();

            //1. Determine the date for the file - from the EXIF data if present or from the modification time
            if (!$isVideo) {
                $violations = $validator->validate($file, [new Image()]);

                if (count($violations)) {
                    foreach ($violations as $violation) {
                        echo "Error processing $fileName - " . $violation->getMessage() . '<br>';
                    }
                    continue;
                }

                $exifPresent = hasExif($fileName);

                if ($exifPresent) {
                    $creationDate = getExif($fileName)->getCreationDate();
                } else {
                    $creationDate = false;
                }
            } else {
                $creationDate = false;
            }

            if ($creationDate === false) {
                $fileDate = date('Y-m-d', $file->getMTime());
                $fileTimestamp = $file->getMTime();
            } else {
                $fileDate = $creationDate->format('Y-m-d');
                $fileTimestamp = strtotime($creationDate->format('Y-m-d H:i:s'));
            }

            $targetPath = str_replace('-', '/', $fileDate);
            $fileSystem->mkdir("$photosDir/$targetPath");
            $newFileName = "$photosDir/$targetPath/" . $file->getFilename();

            //2. Try to auto-rotate the image based on the EXIF data and copy it to the destination filename
            if (!$isVideo) {
                try {
                    if ($exifPresent) {
                        //2.1:
                        //We want Imagine to save the image only if the autorotate will be truly applied
                        //Most of the images will not need to be rotated, and we will simply copy them to the new filename
                        //This saves the overhead of extracting/restoring the Exif data,
                        //and also - it preserves the original image, because Imagine tends to make strange filesizes
                        //(that is why 'jpeg_quality' => 94 below - the value of 100 makes the file much larger)
                        //The AutorotateClass has getTransformations() method from version 1.0.0 (we used 0.7.1 up to now)

                        //$imagineFile = $imagine->open($fileName);
                        //$pendingTransforms = $autorotate->getTransformations($imagineFile);

                        //2020-05-14: Auto rotation is turned Off
                        //Imagine Auto rotation makes things complicated -
                        //if we autorotate an image and restore its EXIF data afterwards, the file becomes wrong oriented
                        //So - we will simply copy the file (preserving it in original) and will auto-rotate only the thumbnail
                        //The thumbnail must be auto rotated, because sometimes it will be oriented wrong
                        //(for example, when making a thumbnail from portrait-oriented phone photo)
                        //This way we will have the original file (with Exif) and correctly oriented thumb (without Exif)
                        $pendingTransforms = [];

                        if (count($pendingTransforms)) {
                            //print_r($pendingTransforms).PHP_EOL;
                            //2.2: Imagine/GD strips the EXIF data after processing, so we need to extract and restore it at the end
                            $exifData = getExifData($fileName);
                            $saveOpts = ['jpeg_quality' => 94, 'png_compression_level' => 1, 'webp_quality' => 100];
                            $autorotate->apply($imagineFile)->save($newFileName, $saveOpts);
                            setExifData($newFileName, $exifData);
                        } else {
                            $fileSystem->copy($fileName, $newFileName);
                        }
                    } else {
                        $fileSystem->copy($fileName, $newFileName);
                    }
                } catch (Imagine\Exception\Exception $exc) {
                    die (var_dump($exc));
                }
            }


            //3. Create the thumb
            if (!$isVideo) {

                $thumb = $imagine->open($newFileName); //this is slow, about 3 files per second
                //$thumb = $imagine->load(file_get_contents($newFileName)); //same performance
                //$thumb=file_get_contents($newFileName); //fast, about 20 files per second, but we need imagine instance
                //continue;

                $width = $thumb->getSize()->getWidth();
                $height = $thumb->getSize()->getHeight();
                if ($width > $height) {
                    $box = $thumb->getSize()->heighten(300);
                } else {
                    $box = $thumb->getSize()->widen(300);
                }

                $thumbName = $newFileName . ".thumb." . $file->getExtension();

                //thumb must be autorotated, otherwise it could be incorrectly rotated based on the preserved Exif data
                $autorotate->apply($thumb->resize($box))->save($thumbName);

            } else {
                $fileSystem->copy($fileName, $newFileName);
                $thumbName = $newFileName . ".thumb.jpg";
                $fileSystem->copy("$thumbTemplatesDir/video-thumb.jpg", $thumbName);

            }

            //4. Update the timestamps for the newly created files and remove the original
            $fileSystem->touch($newFileName, $fileTimestamp);
            $fileSystem->touch($thumbName, $fileTimestamp);

            $fileSystem->remove($fileName);
        }
    }


}

function generateDirStruct()
{
    global $finder, $photosDir;

    $finder->directories()->in($photosDir);

    $arr = [];
    if ($finder->hasResults()) {
        foreach ($finder as $dir) {
            $dirName = $dir->getRelativePathname();
            $dirName = str_replace("\\", "/", $dirName); //under Windows
            $arr[$dirName] = $dirName;
        }
    }
    $arr = explodeTree($arr, "/", true);
    $arr = adjustTree($arr);
    $arr = array_values($arr);
    return $arr;

}

function getPhotos($req)
{
    global $finder, $photosDir, $imgPattern, $videoPattern, $glob;

    $path = $req['path'];

    if (!file_exists("$photosDir/$path")) {
        return [];
    }

    $finder->files()->name("*.thumb.*")->in("$photosDir/$path");

    $arr = [];
    if ($finder->hasResults()) {

        foreach ($finder as $file) {
            $relPath = str_replace("\\", "/", $file->getRelativePath());
            $uriBase = $glob['paths']['photosDir'] . "/" . $path . "/" . $relPath . "/";
            $uriBase = str_replace("//", "/", $uriBase);
            $thumbUri = $uriBase . $file->getFilename();
            $realFileName = substr($file->getFilename(), 0, mb_stripos($file->getFilename(), ".thumb."));
            $realUri = $uriBase . $realFileName;
            $realFileDateTime = date('Y-m-d', filemtime("$photosDir/$path/$relPath/$realFileName"));
            //check for file type
            $fileType = (preg_match($videoPattern, str_replace('.thumb.jpg', '', $file->getFilename()))) ? ('video') : ('photo');
            $arr[] = ['thumbUri' => $thumbUri, 'caption' => "$realFileDateTime / $realFileName", 'realUri' => $realUri, 'date' => $realFileDateTime, 'fileType' => $fileType];
        }
    }

    $datesArr = array_column($arr, 'date');
    $namesArr = array_column($arr, 'caption');
    $sortDirection = ($req['photosSort'] == 'ASC') ? SORT_ASC : SORT_DESC;
    array_multisort($datesArr, $sortDirection, $namesArr, $sortDirection, $arr);

    return $arr;

}

function changePhotoDates()
{
    global $photosDir, $fileSystem, $videoPattern;

    $files = json_decode($_REQUEST['photos']);
    $newDate = $_REQUEST['targetDate'];

    $newPath = "$photosDir/$newDate";
    $fileSystem->mkdir($newPath);

    foreach ($files as $file) {
        $filePath = pathinfo($file, PATHINFO_DIRNAME);
        $fileName = pathinfo($file, PATHINFO_BASENAME);
        $fileExtension = pathinfo($file, PATHINFO_EXTENSION);

        if (preg_match($videoPattern, $fileName)) {
            $thumbName = "$fileName.thumb.jpg";
        } else {
            $thumbName = "$fileName.thumb.$fileExtension";
        }


        $existingFileName = $_SERVER['DOCUMENT_ROOT'] . $file; //the full filesystem path
        $existingThumbFileName = $_SERVER['DOCUMENT_ROOT'] . $filePath . "/" . $thumbName;

        if (file_exists($existingFileName) && file_exists($existingThumbFileName)) {
            $newFileName = $newPath . "/" . $fileName;
            $newThumbFileName = $newPath . "/" . $thumbName;

            rename($existingFileName, $newFileName);
            rename($existingThumbFileName, $newThumbFileName);

            $touchTime = strtotime($newDate);
            touch($newFileName, $touchTime);
            touch($newThumbFileName, $touchTime);
        }

    }

    removeEmptyDirs($photosDir);

}

function rotatePhotos()
{
    global $videoPattern;

    $files = json_decode($_REQUEST['photos']);
    $angle = (int)($_REQUEST['rotateAngle']);

    $imagine = new Imagine\Gd\Imagine();
    $rotate = new Basic\Rotate($angle);

    $saveOpts = ['jpeg_quality' => 94, 'png_compression_level' => 1, 'webp_quality' => 100];

    foreach ($files as $file) {
        $filePath = pathinfo($file, PATHINFO_DIRNAME);
        $fileName = pathinfo($file, PATHINFO_BASENAME);
        $fileExtension = pathinfo($file, PATHINFO_EXTENSION);
        $thumbName = "$fileName.thumb.$fileExtension";

        //skip it if it is a video
        if (preg_match($videoPattern, $fileName)) {
            continue;
        }

        $existingFileName = $_SERVER['DOCUMENT_ROOT'] . $file; //the full filesystem path
        $existingFileNameMtime = filemtime($existingFileName);
        $existingThumbFileName = $_SERVER['DOCUMENT_ROOT'] . $filePath . "/" . $thumbName;
        $existingThumbFileNameMtime = filemtime($existingThumbFileName);

        $exifPresent = hasExif($existingFileName);
        if ($exifPresent) {
            $exifData = getExifData($existingFileName);
        }

        $rotate->apply($imagine->open($existingFileName))->save($existingFileName, $saveOpts);
        $rotate->apply($imagine->open($existingThumbFileName))->save($existingThumbFileName);

        if ($exifPresent) {
            setExifData($existingFileName, $exifData);
        }
        touch($existingFileName, $existingFileNameMtime);
        touch($existingThumbFileName, $existingThumbFileNameMtime);
    }
}

function deletePhotos()
{
    global $photosDir, $fileSystem, $videoPattern;

    $files = json_decode($_REQUEST['photos']);

    foreach ($files as $file) {
        $filePath = pathinfo($file, PATHINFO_DIRNAME);
        $fileName = pathinfo($file, PATHINFO_BASENAME);
        $fileExtension = pathinfo($file, PATHINFO_EXTENSION);
        $thumbName = "$fileName.thumb.$fileExtension";

        if (preg_match($videoPattern, $fileName)) {
            $thumbName = "$fileName.thumb.jpg";
        } else {
            $thumbName = "$fileName.thumb.$fileExtension";
        }

        $existingFileName = $_SERVER['DOCUMENT_ROOT'] . $file; //the full filesystem path
        $existingThumbFileName = $_SERVER['DOCUMENT_ROOT'] . $filePath . "/" . $thumbName;

        if ($fileSystem->exists($existingFileName) && $fileSystem->exists($existingThumbFileName)) {
            $fileSystem->remove($existingFileName);
            $fileSystem->remove($existingThumbFileName);
        }

    }

    removeEmptyDirs($photosDir);

}

function explodeTree($array, $delimiter = '_', $baseval = false)
{
    if (!is_array($array)) return false;
    $splitRE = '/' . preg_quote($delimiter, '/') . '/';
    $returnArr = array();
    foreach ($array as $key => $val) {
        // Get parent parts and the current leaf
        $parts = preg_split($splitRE, $key, -1, PREG_SPLIT_NO_EMPTY);
        $leafPart = array_pop($parts);

        // Build parent structure
        // Might be slow for really deep and large structures
        $parentArr = &$returnArr;
        foreach ($parts as $part) {
            if (!isset($parentArr[$part])) {
                $parentArr[$part] = array();
            } elseif (!is_array($parentArr[$part])) {
                if ($baseval) {
                    $parentArr[$part] = array('__base_val' => $parentArr[$part]);
                } else {
                    $parentArr[$part] = array();
                }
            }
            $parentArr = &$parentArr[$part];
        }

        // Add the final part to the structure
        if (empty($parentArr[$leafPart])) {
            $parentArr[$leafPart] = $val;
        } elseif ($baseval && is_array($parentArr[$leafPart])) {
            $parentArr[$leafPart]['__base_val'] = $val;
        }
    }
    return $returnArr;
}

function adjustTree($arr)
{
    global $photosDir;

    foreach ($arr as $key => &$val) {
        if (is_array($val)) {
            $path = $val['__base_val'];
            unset($val['__base_val']);
            $val = ['leaf' => false, 'expanded' => true, 'text' => (string)$key, 'path' => $path, 'RECORDS' => $val, 'cls' => 'dzz-cursor-pointer'];
            $val['RECORDS'] = adjustTree($val['RECORDS']);
            $val['RECORDS'] = array_values($val['RECORDS']);
        } else {
            $val = ['leaf' => true, 'text' => (string)$key, 'path' => $val, 'nodeType' => 'Day', 'cls' => 'dzz-cursor-pointer', 'items' => countDirFiles("$photosDir/$val", "*thumb*")];
        }
    }

    return $arr;
}

function countDirFiles($dir, $pattern)
{
    $finder = new Finder();
    $res = $finder->files()->name($pattern)->in($dir)->count();
    unset($finder);
    return $res;
}

function removeEmptyDirs($root)
{
    global $imgPattern;

    $fileSystem = new Filesystem();

    $finder = new Finder();
    $res = $finder->files()->name($imgPattern)->in($root);
    unset($finder);

    if ($res->count() == 0) {
        $finder = new Finder();
        $res = $finder->directories()->in($root);
        unset($finder);
        $fileSystem->remove($res);
    }

    $finder = new Finder();
    $res = $finder->directories()->sort(function (\SplFileInfo $a, \SplFileInfo $b) {
        return strcmp($b->getRealPath(), $a->getRealPath());
    })->in($root);
    unset($finder);

    foreach ($res as $dir) {
        $finder = new Finder();
        $curDir = $finder->files()->name($imgPattern)->in(($dir->getRealPath()));
        unset($finder);
        if ($curDir->count() == 0) {
            $fileSystem->remove($dir->getRealPath());
        }
    }
}

function getDirectorySize($dir)
{
    $size = 0;
    foreach (glob(rtrim($dir, '/') . '/*', GLOB_NOSORT) as $each) {
        $size += is_file($each) ? filesize($each) : getDirectorySize($each);
    }
    //print $size;
    return $size;
}

function FileSizeConvert($bytes)
{
    $bytes = floatval($bytes);
    $arBytes = array(
        0 => array(
            "UNIT" => "TB",
            "VALUE" => pow(1024, 4)
        ),
        1 => array(
            "UNIT" => "GB",
            "VALUE" => pow(1024, 3)
        ),
        2 => array(
            "UNIT" => "MB",
            "VALUE" => pow(1024, 2)
        ),
        3 => array(
            "UNIT" => "KB",
            "VALUE" => 1024
        ),
        4 => array(
            "UNIT" => "B",
            "VALUE" => 1
        ),
    );

    foreach ($arBytes as $arItem) {
        if ($bytes >= $arItem["VALUE"]) {
            $result = $bytes / $arItem["VALUE"];
            //$result = str_replace(".", ",", strval(round($result, 2))) . " " . $arItem["UNIT"];
            $result = strval(round($result, 2)) . " " . $arItem["UNIT"];
            break;
        }
    }
    return $result;
}

//check for EXIF presence using miljar/php-exif
function hasExif($fileName)
{
    global $exifReader;

    return (bool)$exifReader->read($fileName);
}

//get EXIF data using miljar/php-exif
function getExif($fileName)
{
    global $exifReader;

    return $exifReader->read($fileName);
}

//get entire EXIF data using lsolesen/PEL
function getExifData($fileName)
{
    $data = new PelDataWindow(file_get_contents($fileName));

    if (PelJpeg::isValid($data)) {
        //file is recognized as jpeg
        $jpeg = new PelJpeg();
        $jpeg->load($data);
        return $jpeg->getExif();
    } elseif (PelTiff::isValid($data)) {
        //file is recognized as tiff
        $tiff = new PelTiff($data);
        return $tiff;
    } else {
        return null;
    }

}

//write entire EXIF data using lsolesen/PEL
function setExifData($fileName, $exifData)
{

    $data = new PelDataWindow(file_get_contents($fileName));

    if (PelJpeg::isValid($data)) {
        //file is recognized as jpeg
        $jpeg = new PelJpeg();
        $jpeg->load($data);
        $jpeg->setExif($exifData);
        $jpeg->saveFile($fileName);

    } elseif (PelTiff::isValid($data)) {
        //file is recognized as tiff
        //there are problems with TIFF files processing so for now we are not saving tiffs, https://github.com/pel/pel/issues/157
        //$tiff = new PelTiff();
        //$tiff->load($data);
        //$tiff->saveFile("1-" . $fileName);
    } else {

    }

}

?>