<?php
require("../inc/globals/globals.inc.php");

function isMobile()
{
    // 1. Sec-CH-UA-Mobile: modern Android Chrome sends '?1' (most reliable)
    if (isset($_SERVER['HTTP_SEC_CH_UA_MOBILE'])) {
        return $_SERVER['HTTP_SEC_CH_UA_MOBILE'] === '?1';
    }
    // 2. Legacy WAP profile header (older feature phones / some Android browsers)
    if (isset($_SERVER['HTTP_X_WAP_PROFILE'])) {
        return true;
    }
    // 3. UA string fallback — covers iOS Safari, older Android, etc.
    //    Note: iPadOS 13+ reports desktop Safari UA, so tablets may land here as desktop.
    //    A JS-side redirect (?mobile=1) below catches that case.
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
    return (bool) preg_match('/(android|iphone|ipad|ipod|mobile|blackberry|windows phone)/i', $ua);
}
// Allow explicit override via query param (JS redirect for edge-case devices)
if (isset($_GET['mobile'])) {
    $isMobile = (bool)$_GET['mobile'];
} else {
    $isMobile = isMobile();
}

if ($isMobile){
    require("login-mobile.php");
}else{
    require("login-desktop.php");
}