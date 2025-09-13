<?php
// api/logout.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

if (isset($_COOKIE['session_token'])) {
  $sessionToken = $_COOKIE['session_token'];
  $stmt = $db->prepare("UPDATE users SET session_token = NULL, session_token_expires_at = NULL WHERE session_token = ?");
  $stmt->execute([$sessionToken]);
}

setcookie('session_token', '', time() - 3600, '/');

json_out(['ok' => true]);