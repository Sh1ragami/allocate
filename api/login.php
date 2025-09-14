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
  $headers = ['Accept: application/json'];
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

  // 3) Store user and session in database
  $stmt = $db->prepare("SELECT * FROM users WHERE github_id = ?");
  $stmt->execute([$user['id']]);
  $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($existingUser) {
    $stmt = $db->prepare("UPDATE users SET access_token = ?, login = ?, avatar_url = ? WHERE id = ?");
    $stmt->execute([$accessToken, $user['login'], $user['avatar_url'], $existingUser['id']]);
    $userId = $existingUser['id'];
  } else {
    $stmt = $db->prepare("INSERT INTO users (github_id, login, avatar_url, access_token) VALUES (?, ?, ?, ?)");
    $stmt->execute([$user['id'], $user['login'], $user['avatar_url'], $accessToken]);
    $userId = $db->lastInsertId();
  }

  // 4) Create session token
  $sessionToken = bin2hex(random_bytes(32));
  $expiresAt = time() + 3600 * 24 * 30; // 30 days

  $stmt = $db->prepare("UPDATE users SET session_token = ?, session_token_expires_at = ? WHERE id = ?");
  $stmt->execute([$sessionToken, $expiresAt, $userId]);

  // 5) Set session cookie
  setcookie('session_token', $sessionToken, [
    'expires' => $expiresAt,
    'path' => '/',
    'domain' => '', // Set your domain in production
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
  ]);

  json_out(['ok' => true, 'user' => $user]);
} catch (Exception $e) {
  json_error($e->getMessage(), 500);
}