<?php

//require($_SERVER['DOCUMENT_ROOT'] . "/inc/globals/globals.inc.php");
require("../../../../inc/globals/globals.inc.php");

$uploadsDir = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['uploadDir'];
$photosDir = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['photosDir'];
$thumbTemplatesDir = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['thumbTemplateDir'];
$diskStatusFileName = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['diskStatusFileName'];
$savedLocationsFileName = $_SERVER['DOCUMENT_ROOT'] . $glob['paths']['savedLocationsFileName'];

//require symfony (and not only) stuff
//require($_SERVER['DOCUMENT_ROOT'] . "/libraries/php/SymfonyComponents/vendor/autoload.php");
require($glob['paths']['appRootPathAbsolute'] . "/libraries/php/SymfonyComponents/vendor/autoload.php");

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Constraints\Image;

use Imagine\Filter\Basic;

use lsolesen\pel\PelExif;
use lsolesen\pel\PelDataWindow;
use lsolesen\pel\PelJpeg;
use lsolesen\pel\PelTiff;
use lsolesen\pel\PelIfd;
use lsolesen\pel\PelTag;
use lsolesen\pel\PelEntryAscii;
use lsolesen\pel\PelEntryRational;
use lsolesen\pel\PelEntryByte;


$fileSystem = new Filesystem();
$finder = new Finder();

$validator = Validation::createValidator();

//exif reader from https://packagist.org/packages/miljar/php-exif
$exifReader = \PHPExif\Reader\Reader::factory(\PHPExif\Reader\Reader::TYPE_NATIVE);


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
    case 'setGpsData':
        setGpsData();
        header("Content-type: application/json");
        print json_encode(['success' => true]);
        die();
        break;
    case 'manageSavedLocations':
        header("Content-type: application/json");
        manageSavedLocations();
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

function setGpsData()
{
    global $videoPattern;

    $files = json_decode($_REQUEST['photos']);

    $latitudeUpdate = (bool)$_REQUEST['gps_lat_update'];
    $latitude = (float)$_REQUEST['gps_latitude'];
    $longitudeUpdate = (bool)$_REQUEST['gps_lng_update'];
    $longitude = (float)$_REQUEST['gps_longitude'];
    $altitudeUpdate = (bool)$_REQUEST['gps_alt_update'];
    $altitude = (float)$_REQUEST['gps_altitude'];

    $preserveExistingData = (bool)$_REQUEST['gps_preserve_existing'];

    foreach ($files as $file) {
        $fileName = pathinfo($file, PATHINFO_BASENAME);

        //skip it if it is a video
        if (preg_match($videoPattern, $fileName)) {
            continue;
        }

        $targetFile = $_SERVER['DOCUMENT_ROOT'] . $file; //the full filesystem path
        $targetFileMtime = filemtime($targetFile);

        //the code below is using instructions found in the Pel examples directory,
        //libraries/php/SymfonyComponents/vendor/lsolesen/pel/examples

        // The input file is now read into a PelDataWindow object. At this point we do not know if the file stores JPEG or TIFF data, so
        // instead of using one of the loadFile methods on PelJpeg or PelTiff we store the data in a PelDataWindow.
        $data = new PelDataWindow(file_get_contents($targetFile));

        // The static isValid methods in PelJpeg and PelTiff will tell us in an efficient manner which kind of data we are dealing with.
        if (PelJpeg::isValid($data)) {
            // The data was recognized as JPEG data, so we create a new empty PelJpeg object which will hold it. When we want to save the
            // image again, we need to know which object to same (using the getBytes method), so we store $jpeg as $file too.
            $img = new PelJpeg();
        } elseif (PelTiff::isValid($data)) {
            // The data was recognized as TIFF data. We prepare a PelTiff object to hold it, and record in $file that the PelTiff object is
            // the top-most object (the one on which we will call getBytes).
            $img = new PelTiff();
        } else {
            //neither JPEG or TIFF file, skipping it
            continue;
        }

        // We then load the data from the PelDataWindow into our PelJpeg/Tiff object. No copying of data will be done, the PelJpeg object will
        // simply remember that it is to ask the PelDataWindow for data when required.
        $img->load($data);

        //The PelJpeg object contains a number of sections, one of which might be our Exif data.
        //The getExif() method is a convenient way of getting the right section with a minimum of fuzz.
        $exif = $img->getExif();

        if ($exif == null) {
            //Ups, there is no APP1 section in the JPEG file. This is where the Exif data should be.
            //In this case we simply create a new APP1 section (a PelExif object) and adds it to the PelJpeg object.
            $exif = new PelExif();
            $img->setExif($exif);

            // We then create an empty TIFF structure in the APP1 section.
            $tiff = new PelTiff();
            $exif->setTiff($tiff);
        } else {
            // Surprice, surprice: Exif data is really just TIFF data! So we extract the PelTiff object for later use.
            $tiff = $exif->getTiff();
        }

        // TIFF data has a tree structure much like a file system. There is a root IFD (Image File Directory) which contains a number of entries
        // and maybe a link to the next IFD. The IFDs are chained together like this, but some of them can also contain what is known as
        // sub-IFDs. For our purpose we only need the first IFD, for this is where the image description should be stored.
        $ifd0 = $tiff->getIfd();

        if ($ifd0 == null) {
            // No IFD in the TIFF data? This probably means that the image didn't have any Exif information to start with, and so an empty
            // PelTiff object was inserted by the code above. But this is no problem, we just create and insert an empty PelIfd object.
            $ifd0 = new PelIfd(PelIfd::IFD0);
            $tiff->setIfd($ifd0);
        }

        //this is a little confusing concept, but all other ifds are retrieved as a sub-ifds of ifd0
        //So, we are searching for the GPS ifd and if it is missing - we are creating one
        $gps_ifd = $ifd0->getSubIfd(PelIfd::GPS);

        if ($gps_ifd == null) {
            // Create a sub-IFD for holding GPS information. GPS data must be below the first IFD.
            $gps_ifd = new PelIfd(PelIfd::GPS);
            $ifd0->addSubIfd($gps_ifd);
        }

        $gps_ifd->addEntry(new PelEntryByte(PelTag::GPS_VERSION_ID, 2, 2, 0, 0));


        //for all 3 parameters, the logic is as is:
        //1. We check if the appropriate checkbox is checked in the frontend (lat/lng/alt)
        //2. If true, the next step is to check if the appropriate tag is already in the file and if the user want to preserve it
        //3. If the tag is not here or preserve existing data checkbox is not checked - we update the value

        //proceed with latitude information
        if ($latitudeUpdate) {
            if (!$preserveExistingData || $gps_ifd->getEntry(PelTag::GPS_LATITUDE) == null) {
                // We interpret a negative latitude as being south.
                $latitude_ref = ($latitude < 0) ? 'S' : 'N';
                $gps_ifd->addEntry(new PelEntryAscii(PelTag::GPS_LATITUDE_REF, $latitude_ref));

                //Use the convertDecimalToDMS function to convert the latitude from something like 12.34° to 12° 20' 42"
                list ($hours, $minutes, $seconds) = convertDecimalToDMS($latitude);
                //addEntry REPLACES existing entries, so there is no way for duplicate entries
                $gps_ifd->addEntry(new PelEntryRational(PelTag::GPS_LATITUDE, $hours, $minutes, $seconds));
            }
        }

        //proceed with longitude information
        if ($longitudeUpdate) {
            if (!$preserveExistingData || $gps_ifd->getEntry(PelTag::GPS_LONGITUDE) == null) {
                // The longitude works like the latitude.
                list ($hours, $minutes, $seconds) = convertDecimalToDMS($longitude);
                $longitude_ref = ($longitude < 0) ? 'W' : 'E';
                $gps_ifd->addEntry(new PelEntryAscii(PelTag::GPS_LONGITUDE_REF, $longitude_ref));

                //addEntry REPLACES existing entries, so there is no way for duplicate entries
                $gps_ifd->addEntry(new PelEntryRational(PelTag::GPS_LONGITUDE, $hours, $minutes, $seconds));
            }
        }

        //proceed with altitude information
        if ($altitudeUpdate) {
            if (!$preserveExistingData || $gps_ifd->getEntry(PelTag::GPS_ALTITUDE) == null) {
                //Add the altitude. The absolute value is stored here, the sign is stored in the GPS_ALTITUDE_REF tag below.
                $gps_ifd->addEntry(new PelEntryRational(PelTag::GPS_ALTITUDE, [abs($altitude), 1]));

                // The reference is set to 1 (true) if the altitude is below sea level, or 0 (false) otherwise.
                $gps_ifd->addEntry(new PelEntryByte(PelTag::GPS_ALTITUDE_REF, (int)($altitude < 0)));
            }
        }


        /* Finally we store the data in the output file. */
        file_put_contents($targetFile, $img->getBytes());

        //and restore its mtime
        touch($targetFile, $targetFileMtime);
    }
}

function manageSavedLocations()
{

    global $fileSystem, $savedLocationsFileName;

    if (!$fileSystem->exists($savedLocationsFileName)) {
        $fileSystem->touch($savedLocationsFileName);
    }

    $locations = json_decode(file_get_contents($savedLocationsFileName), true);

    $actionType = $_REQUEST['actionType'];

    if ($actionType == 'read') {
        $arr = [];
        foreach ($locations as $key => $location) {
            $arr[] = ['id' => $key, 'name' => $location['name'], 'lat' => (float)$location['lat'], 'lng' => (float)$location['lng'], 'alt' => (float)$location['alt'], 'zoom' => (int)$location['zoom']];
        }
        print json_encode(['success' => true, 'RECORDS' => $arr]);
        die();
        //return array_reverse($arr, false);
    }

    if ($actionType == 'create') {
        $data = json_decode($_REQUEST['data'], true);
        $locations[] = ['name' => $data['name'], 'lat' => (float)$data['lat'], 'lng' => (float)$data['lng'], 'alt' => (float)$data['alt'], 'zoom' => (int)$data['zoom']];
        file_put_contents($savedLocationsFileName, json_encode($locations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        print json_encode(['success' => true]);
        die();
    }

    if ($actionType == 'update') {
        $data = json_decode($_REQUEST['data'], true);

        //the update action from ExtJS sends only te modified values, so we need to check this out
        $updateExists = false;
        if (isset($data['name'])) {
            $locations[$data['id']]['name'] = $data['name'];
            $updateExists = true;
        }
        if (isset($data['lat'])) {
            $locations[$data['id']]['lat'] = (float)$data['lat'];
            $updateExists = true;
        }
        if (isset($data['lng'])) {
            $locations[$data['id']]['lng'] = (float)$data['lng'];
            $updateExists = true;
        }
        if (isset($data['alt'])) {
            $locations[$data['id']]['alt'] = (float)$data['alt'];
            $updateExists = true;
        }
        if (isset($data['zoom'])) {
            $locations[$data['id']]['zoom'] = (float)$data['zoom'];
            $updateExists = true;
        }
        if ($updateExists) {
            file_put_contents($savedLocationsFileName, json_encode($locations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        }
        print json_encode(['success' => true]);
        die();
    }

    if ($actionType == 'destroy') {
        $data = json_decode($_REQUEST['data'], true);
        unset($locations[$data['id']]);
        $locations = array_values($locations);
        file_put_contents($savedLocationsFileName, json_encode($locations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        print json_encode(['success' => true]);
        die();
    }


    //    file_put_contents($diskStatusFileName, json_encode($arr['diskStatus']));


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

/**
 * Convert a decimal degree into degrees, minutes, and seconds.
 *
 * @param
 *            int the degree in the form 123.456. Must be in the interval
 *            [-180, 180].
 *
 * @return array a triple with the degrees, minutes, and seconds. Each
 *         value is an array itself, suitable for passing to a
 *         PelEntryRational. If the degree is outside the allowed interval,
 *         null is returned instead.
 */
function convertDecimalToDMS($degree)
{
    if ($degree > 180 || $degree < -180) {
        return null;
    }

    $degree = abs($degree); // make sure number is positive
    // (no distinction here for N/S
    // or W/E).

    $seconds = $degree * 3600; // Total number of seconds.

    $degrees = floor($degree); // Number of whole degrees.
    $seconds -= $degrees * 3600; // Subtract the number of seconds
    // taken by the degrees.

    $minutes = floor($seconds / 60); // Number of whole minutes.
    $seconds -= $minutes * 60; // Subtract the number of seconds
    // taken by the minutes.

    $seconds = round($seconds * 100, 0); // Round seconds with a 1/100th
    // second precision.

    return [
        [
            $degrees,
            1
        ],
        [
            $minutes,
            1
        ],
        [
            $seconds,
            100
        ]
    ];
}

?>