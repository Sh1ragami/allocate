<?php
// api/list_repos.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || !isset($_SESSION['access_token'])) {
  json_error('Unauthorized', 401);
}

// Optional: visibility, affiliation, per_page (max 100), page
$perPage = isset($_GET['per_page']) ? max(1, min(100, (int)$_GET['per_page'])) : 100;
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$affiliation = isset($_GET['affiliation']) ? $_GET['affiliation'] : 'owner,collaborator,organization_member';

$url = 'https://api.github.com/user/repos?per_page=' . $perPage . '&page=' . $page . '&affiliation=' . rawurlencode($affiliation);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ' . $_SESSION['access_token'],
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
$linkHeader = curl_getinfo($ch, CURLINFO_HEADER_OUT);
curl_close($ch);

$data = json_decode($res, true);
if ($status >= 400 || !is_array($data)) {
  json_error('GitHub API error', $status >= 400 ? $status : 500);
}

json_out(['ok' => true, 'repos' => $data]);
