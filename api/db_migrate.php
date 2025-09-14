<?php
// api/db_migrate.php
declare(strict_types=1);

try {
  $db = new PDO('sqlite:' . __DIR__ . '/db.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Add session_token column to users table
  $db->exec("ALTER TABLE users ADD COLUMN session_token TEXT");
  // Add session_token_expires_at column to users table
  $db->exec("ALTER TABLE users ADD COLUMN session_token_expires_at INTEGER");

  echo "Database migrated successfully.";

} catch (PDOException $e) {
  echo "Database error: " . $e->getMessage();
}
