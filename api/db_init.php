<?php
// api/db_init.php
declare(strict_types=1);

try {
  $db = new PDO('sqlite:' . __DIR__ . '/db.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Create users table
  $db->exec("CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id INTEGER UNIQUE NOT NULL,
    login TEXT NOT NULL,
    avatar_url TEXT,
    access_token TEXT NOT NULL
  )");

  // Create projects table
  $db->exec("CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_full_name TEXT UNIQUE NOT NULL
  )");

  // Create project_users table
  $db->exec("CREATE TABLE IF NOT EXISTS project_users (
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'collaborator',
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    PRIMARY KEY (project_id, user_id)
  )");

  echo "Database initialized successfully.";

} catch (PDOException $e) {
  echo "Database error: " . $e->getMessage();
}
