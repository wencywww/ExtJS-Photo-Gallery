<?php
//ds

ini_set('display_errors', '1');
ini_set('session.gc_maxlifetime', 3600);

//This is important and affects the date for the items!!!
//Set your timezone here
ini_set('date.timezone', 'Europe/Sofia');

require 'paths.inc.php';

//require $_SERVER["DOCUMENT_ROOT"] . "/locale/php/getPhpStrings.php";
require $glob['paths']['appRootPathAbsolute'] . "/locale/php/getPhpStrings.php";

//Defaults for the username/password - change them as needed
$glob['usr'] = "admin";
$glob['pass'] = "admin";

//place your own GMaps API key here
$glob['gmapsApiKey'] = "place-your-own-api-key-here";

$eRep = E_ALL & ~E_DEPRECATED & ~E_STRICT & ~E_NOTICE & ~E_WARNING;
error_reporting($eRep);
