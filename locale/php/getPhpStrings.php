<?php

$a = $_REQUEST;

$localesAvailable = Array(
    "bg" => "bg_BG",
    "en" => "en_EN"
);

$defaultLang = "en";
$targetLang = $dzzLang; //set in path.inc.php

if (!array_key_exists($targetLang, $localesAvailable)) {
    $targetLang = $defaultLang;
    $targetLocaleDir = $localesAvailable[$defaultLang];
} else {
    $targetLocaleDir = $localesAvailable[$targetLang];
}


//$str = file_get_contents($_SERVER["DOCUMENT_ROOT"] . "/locale/languages/$targetLocaleDir/Locale.json");
$str = file_get_contents("../languages/$targetLocaleDir/Locale.json");

$locText = json_decode($str, true);

$DZZ_LOC_STRINGS = $locText['PHP'];
$DZZ_LOC_STRINGS['common'] = $locText['COMMON']['php'];


?>