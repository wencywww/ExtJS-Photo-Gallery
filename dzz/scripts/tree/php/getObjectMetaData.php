<?php

$outArr['xtype'] = "homeGalleryDataView";
$outArr['success'] = true;

header("Content-type: application/json");
print json_encode($outArr);
die();

?>