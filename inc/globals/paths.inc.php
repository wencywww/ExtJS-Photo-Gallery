<?php
//die(phpinfo());
$glob['paths']['docRoot'] = $_SERVER['DOCUMENT_ROOT'];

//should be empty if the application is running on a separate virtual host, or string with a leading slash if it lives in a subdirectory, e.g. "/gallery"
//$glob['paths']['appRootPrefix'] = "/gallery";
$glob['paths']['appRootPrefix'] = "";

$glob['paths']['appRootPathAbsolute'] = $_SERVER['DOCUMENT_ROOT'];
$glob['paths']['appRootPathAbsolute'] .= (strlen($glob['paths']['appRootPrefix'])) ? ($glob['paths']['appRootPrefix']) : ("");

$glob['paths']['extIncPath'] = $glob['paths']['appRootPrefix'] . "/libraries/js/ext";

$glob['paths']['uploadDir'] = $glob['paths']['appRootPrefix'] . "/data/upload";
$glob['paths']['photosDir'] = $glob['paths']['appRootPrefix'] . "/data/photos";
$glob['paths']['thumbTemplateDir'] = $glob['paths']['appRootPrefix'] . "/data/thumb-template";
$glob['paths']['diskStatusFileName'] = $glob['paths']['photosDir'] . "/diskStatus.json";


$dzzTheme = (isset($_COOKIE['dzz_UITheme'])) ? ($_COOKIE['dzz_UITheme']) : ("classic");
$dzzLang = (isset($_COOKIE['dzz_UILang'])) ? ($_COOKIE['dzz_UILang']) : ("en");
$glob['dzzLang'] = $dzzLang;


$glob['paths']['extThemeCSS'] = $glob['paths']['extIncPath'] . "/build/classic/theme-$dzzTheme/resources/theme-$dzzTheme-all.css";
$glob['paths']['extThemeJS'] = $glob['paths']['extIncPath'] . "/build/classic/theme-$dzzTheme/theme-$dzzTheme.js";
$glob['paths']['extAllJS'] = $glob['paths']['extIncPath'] . "/build/ext-all.js";
$glob['paths']['extLocaleJS'] = $glob['paths']['extIncPath'] . "/build/classic/locale/locale-$dzzLang.js";


$glob['paths']['font-awesomeCSS'] = $glob['paths']['appRootPrefix'] . "/libraries/css/fa/fontawesome-free-5.13.0-web/css/all.css";

$glob['paths']['jqueryJS'] = $glob['paths']['appRootPrefix'] . "/libraries/js/jquery/jquery.min.js";

$glob['paths']['jquery-fancybox-css'] = $glob['paths']['appRootPrefix'] . "/libraries/js/jquery/jq-fancybox/jq-fancybox.css";
$glob['paths']['jquery-fancybox-js'] = $glob['paths']['appRootPrefix'] . "/libraries/js/jquery/jq-fancybox/jq-fancybox.js";

$glob['paths']['dropzonejs-css'] = $glob['paths']['appRootPrefix'] . "/libraries/js/dropzoneJS/dropzone-5.7.0/dist/dropzone.css";
$glob['paths']['dropzonejs-js'] = $glob['paths']['appRootPrefix'] . "/libraries/js/dropzoneJS/dropzone-5.7.0/dist/dropzone.js";

$glob['paths']['exifreader-js'] = $glob['paths']['appRootPrefix'] . "/libraries/js/exifReader/exif-reader.js";


?>
