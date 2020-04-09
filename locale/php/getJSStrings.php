<?php

$a = $_REQUEST;

$localesAvailable = Array(
    "bg" => "bg_BG",
    "en" => "en_EN"
);

$defaultLang = "en";

$targetLang = $_COOKIE['dzz_UILang'];

if (!array_key_exists($targetLang, $localesAvailable)) {
    $targetLang = $defaultLang;
    $targetLocaleDir = $localesAvailable[$defaultLang];
} else {
    $targetLocaleDir = $localesAvailable[$targetLang];
}


//$str = file_get_contents($_SERVER["DOCUMENT_ROOT"] . "/locale/languages/$targetLocaleDir/Locale.json");
$str = file_get_contents("../languages/$targetLocaleDir/Locale.json");

$locText = json_decode($str, true);

$locText = clearJSONArray($locText);

$outArr['Captions'] = $locText['JS'];
$outArr['CommonCaptions'] = $locText['COMMON']['js'];
$outArr['Locale'] = $targetLang;


$outArr['success'] = true;
print json_encode($outArr);
die();

//clears the comments within JSONs
function clearJSONArray($arr)
{

    //while ( list($key,$val) = each($arr) )
    foreach ($arr as $key => &$val) {
        if (is_array($val)) {
            $val = clearJSONArray($val);
        } else {
            if (substr($key, 0, 2) == "**") {
                unset($arr[$key]);
            }
        }
    }

    return $arr;
}

?>