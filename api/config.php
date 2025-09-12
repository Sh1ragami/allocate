<?php
// api/config.php
declare(strict_types=1);

// --- .env 読み込み ---
require_once __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// --- Environment ---
// .env から環境変数を取得
$GITHUB_CLIENT_ID = $_ENV['GITHUB_CLIENT_ID'] ?? '';
$GITHUB_CLIENT_SECRET = $_ENV['GITHUB_CLIENT_SECRET'] ?? '';
$APP_BASE_URL = $_ENV['APP_BASE_URL'] ?? (isset($_SERVER['REQUEST_SCHEME']) && isset($_SERVER['HTTP_HOST']) ? $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] : '');

// --- Session ---
ini_set('session.use_strict_mode', '1');
session_name('gh_oauth');
session_start();

// --- CORS (adjust for production) ---
$ALLOWED_ORIGIN = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header('Access-Control-Allow-Origin: ' . $ALLOWED_ORIGIN);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// --- JSON helpers ---
function json_out($data, int $code = 200): void
{
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function json_error(string $msg, int $code = 400): void
{
  json_out(['ok' => false, 'error' => $msg], $code);
}

function http_post_json(string $url, array $headers, array $payload): array
{
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
  $res = curl_exec($ch);
  if ($res === false) {
    $err = curl_error($ch);
    curl_close($ch);
    throw new Exception('cURL error: ' . $err);
  }
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($status >= 400) {
    throw new Exception('HTTP status ' . $status . ': ' . $res);
  }
  // GitHub returns application/x-www-form-urlencoded by default unless we ask JSON.
  // But we set Accept: application/json below, so parse JSON.
  $data = json_decode($res, true);
  if (!is_array($data)) {
    throw new Exception('Invalid JSON from GitHub: ' . $res);
  }
  return $data;
}

function http_get_json(string $url, array $headers): array
{
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  $res = curl_exec($ch);
  if ($res === false) {
    $err = curl_error($ch);
    curl_close($ch);
    throw new Exception('cURL error: ' . $err);
  }
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($status >= 400) {
    throw new Exception('HTTP status ' . $status . ': ' . $res);
  }
  $data = json_decode($res, true);
  if (!is_array($data)) {
    throw new Exception('Invalid JSON from GitHub: ' . $res);
  }
  return $data;
}
