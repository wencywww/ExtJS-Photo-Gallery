<?php
session_start();
authorize();

function authorize()
{
    global $glob;

    if (!$_SESSION['loginValid']) {
        //header("Location: " . $glob['paths']['appRootPrefix'] . "/login/logout.php");
        header("Location: ../login/logout.php");
    }
}

?>