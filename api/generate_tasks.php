<?php
// api/generate_tasks.php
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
$appIdea = isset($input['app_idea']) ? trim((string)$input['app_idea']) : '';

if ($appIdea === '') {
  json_error('Missing app_idea', 400);
}

// --- Mock AI Task Generation ---
// In a real application, you would call an AI service here.
$tasks = [
  'Set up project structure with frontend and backend directories',
  'Initialize a database and create a schema for users and tasks',
  'Implement user authentication (registration, login, logout)',
  'Create the main dashboard UI with a Kanban board',
  'Develop API endpoints for creating, reading, updating, and deleting tasks',
  'Connect the frontend to the backend APIs',
  'Implement drag-and-drop functionality for the Kanban board',
  'Add user collaboration features',
];

json_out(['ok' => true, 'tasks' => $tasks]);
