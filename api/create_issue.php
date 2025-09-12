<?php
// api/create_issue.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || !isset($_SESSION['access_token'])) {
  json_error('Unauthorized', 401);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$owner = isset($input['owner']) ? trim((string)$input['owner']) : '';
$repo = isset($input['repo']) ? trim((string)$input['repo']) : '';
$title = isset($input['title']) ? trim((string)$input['title']) : '';
$body = isset($input['body']) ? (string)$input['body'] : '';
$assignees = isset($input['assignees']) && is_array($input['assignees']) ? $input['assignees'] : [];
$labels = isset($input['labels']) && is_array($input['labels']) ? $input['labels'] : [];

if ($owner === '' || $repo === '' || $title === '') {
  json_error('Missing owner/repo/title', 400);
}

$payload = [
  'title' => $title,
  'body' => $body,
];
if (!empty($assignees)) {
  $payload['assignees'] = $assignees;
}
if (!empty($labels)) {
  $payload['labels'] = $labels;
}

$url = "https://api.github.com/repos/{$owner}/{$repo}/issues";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ' . $_SESSION['access_token'],
  'Accept: application/vnd.github+json',
  'X-GitHub-Api-Version: 2022-11-28',
  'User-Agent: php-github-oauth-demo',
  'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
$res = curl_exec($ch);
if ($res === false) {
  $err = curl_error($ch);
  curl_close($ch);
  json_error('cURL error: ' . $err, 500);
}
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($res, true);
if ($status >= 400) {
  $msg = is_array($data) && isset($data['message']) ? $data['message'] : $res;
  json_error('GitHub API error: ' . $msg, $status);
}

json_out(['ok' => true, 'issue' => $data]);
