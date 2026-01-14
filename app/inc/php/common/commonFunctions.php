<?php

function commonRaiseMessage($status, $Title, $Text)
{
    global $glob, $DZZ_LOC_STRINGS;

    $arr['success'] = $status;
    $arr['Title'] = (strlen($Title)) ?
        ($Title) :
        (($status) ? ($DZZ_LOC_STRINGS['common']['INFO']) : ($DZZ_LOC_STRINGS['common']['ERROR']));

    $arr['Text'] = $Text;

    header("Content-type: application/json");
    print json_encode($arr);

    die();
}

?>