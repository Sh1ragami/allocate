<?php
// api/create_repo.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

$user = get_user_from_session_token();
if (!$user) {
  json_error('Unauthorized', 401);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$name = isset($input['name']) ? trim((string)$input['name']) : '';
$description = isset($input['description']) ? (string)$input['description'] : '';
$isPrivate = isset($input['private']) ? (bool)$input['private'] : false;
if ($name === '') {
  json_error('Missing repo name', 400);
}

$body = [
  'name' => $name,
  'description' => $description,
  'private' => $isPrivate,
  'auto_init' => true,
];

$ch = curl_init('https://api.github.com/user/repos');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ' . $user['access_token'],
  'Accept: application/vnd.github+json',
  'X-GitHub-Api-Version: 2022-11-28',
  'User-Agent: php-github-oauth-demo',
  'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
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
  $log_file = __DIR__ . '/error.log';
  $log_message = date('Y-m-d H:i:s') . " - GitHub API Error: " . $res . "\n";
  file_put_contents($log_file, $log_message, FILE_APPEND);

  $msg = is_array($data) && isset($data['message']) ? $data['message'] : 'Repository creation failed.';
  json_error('GitHub API error: ' . $msg, $status);
}

// Add project to database and set creator as owner
$repoFullName = $data['full_name'];
$stmt = $db->prepare("INSERT INTO projects (repo_full_name) VALUES (?)");
$stmt->execute([$repoFullName]);
$projectId = $db->lastInsertId();

$stmt = $db->prepare("INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)");
$stmt->execute([$projectId, $user['id'], 'owner']);

json_out(['ok' => true, 'repo' => $data]);