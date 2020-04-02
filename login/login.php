<?php
require($_SERVER["DOCUMENT_ROOT"] . "/inc/globals/globals.inc.php");
?>
<!DOCTYPE html>
<html>
<head>
    <title><?= $DZZ_LOC_STRINGS['common']['GALLERY-TITLE'] ?></title>

    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">

    <!-- Font awesome -->
    <link rel="stylesheet" type="text/css" href="<?=$glob['paths']['font-awesomeCSS']?>"/>

    <!-- ExtJS initialization stuff -->
    <link rel="stylesheet" type="text/css" href="<?= $glob['paths']['extThemeCSS'] ?>"/>
    <script type="text/javascript" src="<?= $glob['paths']['extAllJS'] ?>"></script>
    <script type="text/javascript" src="<?= $glob['paths']['extThemeJS'] ?>"></script>

    <!-- ExtJS localization support -->
    <script type="text/javascript" src="<?= $glob['paths']['extLocaleJS'] ?>"></script>

    <!-- initialize the current language (app-specific) strings -->
    <script type="text/javascript" src="<?= $glob['paths']['appRootPrefix'] ?>/locale/js/initLang.js"></script>

    <!-- app specific css -->
    <link rel="stylesheet" type="text/css" href="<?= $glob['paths']['appRootPrefix'] ?>/inc/css/dzzCustom.css"/>

    <!-- Common JS Stuff -->
    <script type="text/javascript"
            src="<?= $glob['paths']['appRootPrefix'] ?>/inc/js/common/commonFunctions.js"></script>

    <!-- Common ExtJS overrides -->
    <script type="text/javascript" src="<?=$glob['paths']['appRootPrefix']?>/inc/js/common/commonOverrides.js"></script>

    <!-- Include the main JavaScript file -->
    <script type="text/javascript" src="<?= $glob['paths']['appRootPrefix'] ?>/login/js/Main.js"></script>

</head>


<body>
</body>
</html>