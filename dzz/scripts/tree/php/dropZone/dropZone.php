<?php


require "../../../../../inc/globals/paths.inc.php";


ini_set('upload_max_filesize', '0');
ini_set('post_max_size', '0');

$ds = DIRECTORY_SEPARATOR;

$storeFolder = '../../../../../data/upload';

if (!empty($_FILES)) {

    $tempFile = $_FILES['file']['tmp_name'];

    $targetPath = $storeFolder . $ds;

    $targetFile =  $targetPath. $_FILES['file']['name'];

    move_uploaded_file($tempFile,$targetFile);

}