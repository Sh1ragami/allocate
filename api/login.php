<?php
// api/login.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$code = isset($input['code']) ? trim((string)$input['code']) : '';
if ($code === '') {
  json_error('Missing code', 400);
}
if ($GITHUB_CLIENT_ID === '' || $GITHUB_CLIENT_SECRET === '') {
  json_error('Server not configured (missing client id/secret)', 500);
}

try {
  // 1) Exchange code for access token
  $tokenUrl = 'https://github.com/login/oauth/access_token';
  $headers = [
    'Accept: application/json',
  ];
  $payload = [
    'client_id' => $GITHUB_CLIENT_ID,
    'client_secret' => $GITHUB_CLIENT_SECRET,
    'code' => $code,
    'redirect_uri' => $APP_BASE_URL . '/public/index.html',
  ];
  $tokenRes = http_post_json($tokenUrl, $headers, $payload);
  if (!isset($tokenRes['access_token'])) {
    json_error('Token exchange failed', 400);
  }
  $accessToken = $tokenRes['access_token'];

  // 2) Fetch user
  $user = http_get_json('https://api.github.com/user', [
    'Authorization: Bearer ' . $accessToken,
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28',
    'User-Agent: php-github-oauth-demo',
  ]);

  // 3) Store in session (do NOT store access token in production unless encrypted)
  $_SESSION['user'] = $user;
  $_SESSION['logged_in'] = true;
  $_SESSION['login_at'] = time();
  $_SESSION['access_token'] = $accessToken;

  json_out(['ok' => true, 'user' => $user]);
} catch (Exception $e) {
  json_error($e->getMessage(), 500);
}
