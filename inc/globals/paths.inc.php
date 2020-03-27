<?php

$glob['paths']['appRootPrefix'] = "";

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


$glob['paths']['jqueryJS'] = "/libraries/js/jquery/jquery.min.js";

$glob['paths']['jquery-fancybox-css'] = "/libraries/js/jquery/jq-fancybox/jq-fancybox.css";
$glob['paths']['jquery-fancybox-js'] = "/libraries/js/jquery/jq-fancybox/jq-fancybox.js";



?>
