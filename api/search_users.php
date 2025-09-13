<?php
// api/search_users.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}

$user = get_user_from_session_token();
if (!$user) {
  json_error('Unauthorized', 401);
}

if (!isset($_GET['q'])) {
  json_error('Missing search query parameter (q)', 400);
}
$query = trim($_GET['q']);

if ($query === '') {
  json_out(['ok' => true, 'users' => []]);
}

$url = "https://api.github.com/search/users?q=" . urlencode($query);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ' . $user['access_token'],
  'Accept: application/vnd.github+json',
  'X-GitHub-Api-Version: 2022-11-28',
  'User-Agent: php-github-oauth-demo',
]);
$res = curl_exec($ch);
if ($res === false) {
  $err = curl_error($ch);
  curl_close($ch);
  json_error('cURL error: ' . $err, 500);
}
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($res, true);
if ($status >= 400 || !is_array($data)) {
  json_error('GitHub API error', $status >= 400 ? $status : 500);
}

json_out(['ok' => true, 'users' => $data['items'] ?? []]);
