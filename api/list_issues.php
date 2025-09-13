<?php
// api/list_issues.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}

$user = get_user_from_session_token();
if (!$user) {
  json_error('Unauthorized', 401);
}

if (!isset($_GET['owner']) || !isset($_GET['repo'])) {
  json_error('Missing owner or repo parameter', 400);
}

$owner = $_GET['owner'];
$repo = $_GET['repo'];

$url = "https://api.github.com/repos/{$owner}/{$repo}/issues?state=all";

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

json_out(['ok' => true, 'issues' => $data]);