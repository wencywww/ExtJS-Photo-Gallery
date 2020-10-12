#!/usr/bin/php
<?php

/**
 * PEL: PHP Exif Library.
 * A library with support for reading and
 * writing all Exif headers in JPEG and TIFF images using PHP.
 *
 * Copyright (C) 2004, 2005, 2006 Martin Geisler.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program in the file COPYING; if not, write to the
 * Free Software Foundation, Inc., 51 Franklin St, Fifth Floor,
 * Boston, MA 02110-1301 USA
 */

/* Make PEL speak the users language, if it is available. */
setlocale(LC_ALL, '');

//require_once dirname(__FILE__) . '/../vendor/autoload.php';
require_once dirname(__FILE__) . '/../autoload.php';

use lsolesen\pel\Pel;
use lsolesen\pel\PelDataWindow;
use lsolesen\pel\PelJpeg;
use lsolesen\pel\PelTiff;
use lsolesen\pel\PelIfd;
use lsolesen\pel\PelTag;
use lsolesen\pel\PelEntryAscii;
use lsolesen\pel\PelEntryRational;
use lsolesen\pel\PelEntryByte;

$prog = array_shift($argv);
$file = '';

while (!empty($argv)) {
    switch ($argv[0]) {
        case '-d':
            Pel::setDebug(true);
            break;
        case '-s':
            Pel::setStrictParsing(true);
            break;
        default:
            $file = $argv[0];
            break;
    }
    array_shift($argv);
}

if (empty($file)) {
    printf("Usage: %s [-d] [-s] <filename>\n", $prog);
    print("Optional arguments:\n");
    print("  -d        turn debug output on.\n");
    print("  -s        turn strict parsing on (halt on errors).\n");
    print("Mandatory arguments:\n");
    print("  filename  a JPEG or TIFF image.\n");
    exit(1);
}

if (!is_readable($file)) {
    printf("Unable to read %s!\n", $file);
    exit(1);
}

/*
 * We typically need lots of RAM to parse TIFF images since they tend
 * to be big and uncompressed.
 */
ini_set('memory_limit', '32M');

$data = new PelDataWindow(file_get_contents($file));

if (PelJpeg::isValid($data)) {
    $img = new PelJpeg();
} elseif (PelTiff::isValid($data)) {
    $img = new PelTiff();
} else {
    print("Unrecognized image format! The first 16 bytes follow:\n");
    PelConvert::bytesToDump($data->getBytes(0, 16));
    exit(1);
}

/* Try loading the data. */
$img->load($data);

$exif = $img->getExif();

if ($exif == null) {
    /*
     * Ups, there is no APP1 section in the JPEG file. This is where
     * the Exif data should be.
     */
    print('No APP1 section found, added new.' . PHP_EOL);

    /*
     * In this case we simply create a new APP1 section (a PelExif
     * object) and adds it to the PelJpeg object.
     */
    $exif = new PelExif();
    $img->setExif($exif);

    /* We then create an empty TIFF structure in the APP1 section. */
    $tiff = new PelTiff();
    $exif->setTiff($tiff);
} else {
    /*
     * Surprice, surprice: Exif data is really just TIFF data! So we
     * extract the PelTiff object for later use.
     */
    print('Found existing APP1 section.' . PHP_EOL);
    $tiff = $exif->getTiff();
}

$ifd0 = $tiff->getIfd();

if ($ifd0 == null) {
    /*
     * No IFD in the TIFF data? This probably means that the image
     * didn't have any Exif information to start with, and so an empty
     * PelTiff object was inserted by the code above. But this is no
     * problem, we just create and inserts an empty PelIfd object.
     */
    print('No IFD found, adding new.' . PHP_EOL);
    $ifd0 = new PelIfd(PelIfd::IFD0);
    $tiff->setIfd($ifd0);
}


$gps_ifd = $ifd0->getSubIfd(PelIfd::GPS);

if ($gps_ifd == null) {
    $gps_ifd = new PelIfd(PelIfd::GPS);
    $ifd0->addSubIfd($gps_ifd);
}

$gps_ifd->addEntry(new PelEntryByte(PelTag::GPS_VERSION_ID, 2, 2, 0, 0));

$latitude = 43.2507405;
$longitude = 24.7341142;
$altitude = 8848;
/* We interpret a negative latitude as being south. */
$latitude_ref = ($latitude < 0) ? 'S' : 'N';

list ($hours, $minutes, $seconds) = convertDecimalToDMS($latitude);

$gps_ifd->addEntry(new PelEntryAscii(PelTag::GPS_LATITUDE_REF, $latitude_ref));
$gps_ifd->addEntry(new PelEntryRational(PelTag::GPS_LATITUDE, $hours, $minutes, $seconds));

/* The longitude works like the latitude. */
list ($hours, $minutes, $seconds) = convertDecimalToDMS($longitude);
$longitude_ref = ($longitude < 0) ? 'W' : 'E';

$gps_ifd->addEntry(new PelEntryAscii(PelTag::GPS_LONGITUDE_REF, $longitude_ref));
$gps_ifd->addEntry(new PelEntryRational(PelTag::GPS_LONGITUDE, $hours, $minutes, $seconds));


/*
     * Add the altitude. The absolute value is stored here, the sign is
     * stored in the GPS_ALTITUDE_REF tag below.
     */
$gps_ifd->addEntry(new PelEntryRational(PelTag::GPS_ALTITUDE, [
    abs($altitude),
    1
]));
/*
 * The reference is set to 1 (true) if the altitude is below sea
 * level, or 0 (false) otherwise.
 */
$gps_ifd->addEntry(new PelEntryByte(PelTag::GPS_ALTITUDE_REF, (int)($altitude < 0)));


/* Finally we store the data in the output file. */
file_put_contents('topchi_gps.jpg', $img->getBytes()); die();


var_dump($ifd_gps);
die();
print_r($gps->getEntry(PelTag::GPS_LATITUDE_REF));

//print($img);

// /* Deal with any exceptions: */
// if (count(Pel::getExceptions()) > 0) {
//     print("\nThe following errors were encountered while loading the image:\n");
//     foreach (Pel::getExceptions() as $e) {
//         print("\n" . $e->__toString());
//     }
// }

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