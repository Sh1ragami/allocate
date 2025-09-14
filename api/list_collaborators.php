<?php
// api/list_collaborators.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed', 405);
}

$currentUser = get_user_from_session_token();
if (!$currentUser) {
  json_error('Unauthorized', 401);
}

if (!isset($_GET['repo_full_name'])) {
  json_error('Missing repo_full_name parameter', 400);
}
$repoFullName = $_GET['repo_full_name'];

// 1. Get the project id
$stmt = $db->prepare("SELECT id FROM projects WHERE repo_full_name = ?");
$stmt->execute([$repoFullName]);
$project = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$project) {
  json_out(['ok' => true, 'collaborators' => []]);
}
$projectId = $project['id'];

// 2. Get all users for the project
$stmt = $db->prepare("SELECT u.login, u.avatar_url, pu.role FROM users u JOIN project_users pu ON u.id = pu.user_id WHERE pu.project_id = ?");
$stmt->execute([$projectId]);
$collaborators = $stmt->fetchAll(PDO::FETCH_ASSOC);

json_out(['ok' => true, 'collaborators' => $collaborators]);
