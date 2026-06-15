<?php
//ds

//ini_set('display_errors', '1');

require 'paths.inc.php';
require 'version.php';

//user overrides
require 'gallery-config.php';

// Resolve the effective maps provider: fall back to OSM if an unknown provider is configured,
// or if Google Maps is selected but no valid API key is configured
$glob['effectiveMapsProvider'] = $glob['mapsProvider'];
if (!in_array($glob['effectiveMapsProvider'], ['GM', 'OSM'], true)) {
    $glob['effectiveMapsProvider'] = 'OSM';
}
if ($glob['effectiveMapsProvider'] === 'GM') {
    $gmapsKey = trim($glob['gmapsApiKey'] ?? '');
    if ($gmapsKey === '' || $gmapsKey === 'place-your-own-api-key-here') {
        $glob['effectiveMapsProvider'] = 'OSM';
    }
}

require $glob['paths']['appRootPathAbsolute'] . "/locale/php/getPhpStrings.php";

#$eRep = E_ALL & ~E_DEPRECATED & ~E_NOTICE & ~E_WARNING;
#error_reporting($eRep);
