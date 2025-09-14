<?php
// api/add_user_to_project.php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed', 405);
}

$currentUser = get_user_from_session_token();
if (!$currentUser) {
  json_error('Unauthorized', 401);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$repoFullName = isset($input['repo_full_name']) ? trim((string)$input['repo_full_name']) : '';
$userLogin = isset($input['user_login']) ? trim((string)$input['user_login']) : '';

if ($repoFullName === '' || $userLogin === '') {
  json_error('Missing repo_full_name or user_login', 400);
}

// 1. Get the project id
$stmt = $db->prepare("SELECT id FROM projects WHERE repo_full_name = ?");
$stmt->execute([$repoFullName]);
$project = $stmt->fetch(PDO::FETCH_ASSOC);

if ($project) {
  $projectId = $project['id'];
} else {
  $stmt = $db->prepare("INSERT INTO projects (repo_full_name) VALUES (?)");
  $stmt->execute([$repoFullName]);
  $projectId = $db->lastInsertId();
}

// 2. Get the user id of the user to be added
$stmt = $db->prepare("SELECT id FROM users WHERE login = ?");
$stmt->execute([$userLogin]);
$userToAdd = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$userToAdd) {
  json_error('User not found. They need to log in to the application first.', 404);
}
$userIdToAdd = $userToAdd['id'];

// 3. Add the user to the project
// TODO: Add permission check here

try {
  $stmt = $db->prepare("INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)");
  $stmt->execute([$projectId, $userIdToAdd, 'collaborator']);
} catch (PDOException $e) {
  // Ignore if the user is already in the project (UNIQUE constraint violation)
  if ($e->getCode() !== '23000') {
    throw $e;
  }
}

json_out(['ok' => true]);
