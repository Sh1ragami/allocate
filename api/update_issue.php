<?php
// api/update_issue.php
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
$owner = isset($input['owner']) ? trim((string)$input['owner']) : '';
$repo = isset($input['repo']) ? trim((string)$input['repo']) : '';
$issueNumber = isset($input['issue_number']) ? (int)$input['issue_number'] : 0;
$payload = isset($input['payload']) && is_array($input['payload']) ? $input['payload'] : [];

if ($owner === '' || $repo === '' || $issueNumber === 0 || empty($payload)) {
  json_error('Missing owner, repo, issue_number, or payload', 400);
}

$url = "https://api.github.com/repos/{$owner}/{$repo}/issues/{$issueNumber}";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ' . $user['access_token'],
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