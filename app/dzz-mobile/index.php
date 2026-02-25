<?php
require("../inc/php/auth.php");
require("../inc/globals/globals.inc.php");
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($glob['dzzLang'], ENT_QUOTES) ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?= $DZZ_LOC_STRINGS['common']['GALLERY-TITLE'] ?></title>

    <!-- Font Awesome -->
    <link rel="stylesheet" type="text/css" href="<?= $glob['paths']['font-awesomeCSS'] ?>" />

    <!-- Fancybox -->
    <link rel="stylesheet" href="<?= $glob['paths']['jquery-fancybox-css'] ?>">

    <!-- DropZone -->
    <link rel="stylesheet" href="<?= $glob['paths']['dropzonejs-css'] ?>">

    <!-- Mobile App CSS -->
    <link rel="stylesheet" type="text/css" href="css/mobile.css" />

    <!-- jQuery -->
    <script src="<?= $glob['paths']['jqueryJS'] ?>"></script>

    <!-- Fancybox -->
    <script src="<?= $glob['paths']['jquery-fancybox-js'] ?>"></script>

    <!-- DropZone -->
    <script src="<?= $glob['paths']['dropzonejs-js'] ?>"></script>
    <script>
        Dropzone.autoDiscover = false;
    </script>

    <!-- ExifReader -->
    <script src="<?= $glob['paths']['exifreader-js'] ?>"></script>

    <!-- Google Maps API -->
    <script src="<?= $glob['paths']['googlemaps-js'] ?>?key=<?= $glob['gmapsApiKey'] ?>"></script>

    <!-- Vue 3 (global build, vendored) -->
    <script src="/libraries/js/vue/vue.global.prod.js"></script>

    <!-- PHP → JS config bridge -->
    <script>
        window.GALLERY_CONFIG = {
            apiUrl: '../dzz/scripts/tree/php/processUploads.php',
            uploadUrl: '../dzz/scripts/tree/php/dropZone/dropZone.php',
            localeUrl: '../locale/php/getJSStrings.php',
            lang: '<?= htmlspecialchars($glob['dzzLang'], ENT_QUOTES) ?>'
        };
    </script>
</head>

<body>
    <div id="app"></div>
    <script type="module" src="js/app.js"></script>
</body>

</html>