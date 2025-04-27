
<?php
if (isset($_POST['message'])) {
    $msg = strip_tags($_POST['message']);
    file_put_contents("../storage/messages.txt", $msg . "\n", FILE_APPEND);
}
?>
