<?php

require($_SERVER["DOCUMENT_ROOT"] . "/inc/globals/globals.inc.php");
require($_SERVER["DOCUMENT_ROOT"] . "/inc/php/common/commonFunctions.php");


$a = $_POST;

find_user($a);


function find_user($a)
{
    global $glob, $DZZ_LOC_STRINGS;

    if ($a['userName'] <> $glob['usr'] || $a['userPassword'] <> $glob['pass']) {
        commonRaiseMessage(false, $DZZ_LOC_STRINGS['common']['ERROR'], $DZZ_LOC_STRINGS['common']['passwordInvalid']);
    } else {
        session_start();
        $_SESSION['loginValid'] = true;
        $outArr['success'] = true;
        print json_encode($outArr);
        die();
    }

}

?>