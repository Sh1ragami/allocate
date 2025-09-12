<?php
// api/me.php
declare(strict_types=1);
require __DIR__ . '/config.php';

// If query param client_info=1, return public client info for building the authorize URL
if (isset($_GET['client_info'])) {
  json_out([
    'ok' => true,
    'github_client_id' => $GITHUB_CLIENT_ID,
    'app_base_url' => $APP_BASE_URL,
  ]);
}

if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || !isset($_SESSION['user'])) {
  json_out(['ok' => true, 'user' => null]);
}
json_out(['ok' => true, 'user' => $_SESSION['user']]);
