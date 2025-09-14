<?php
// api/me.php
declare(strict_types=1);
require __DIR__ . '/config.php';

// If query param client_info=1, return public client info for building the authorize URL
if (isset($_GET['client_info'])) {
  json_out([
    'ok' => true,
    'github_client_id' => $GITHUB_CLIENT_ID,
    'app_base_url' => $APP_BASE_URL,
  ]);
}

$user = get_user_from_session_token();
if (!$user) {
  json_out(['ok' => true, 'user' => null]);
}

// We have a valid session, let's fetch the user from GitHub to make sure the token is still valid
try {
  $githubUser = http_get_json('https://api.github.com/user', [
    'Authorization: Bearer ' . $user['access_token'],
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28',
    'User-Agent: php-github-oauth-demo',
  ]);
  json_out(['ok' => true, 'user' => $githubUser]);
} catch (Exception $e) {
  // This can happen if the token is revoked by the user on GitHub
  json_out(['ok' => true, 'user' => null]);
}