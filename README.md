# PHP + Vanilla JS GitHub OAuth Demo

This is a minimal rewrite of a GitHub OAuth tutorial using **PHP (backend)** and **HTML/JS/CSS (frontend)**.

## What it does
- Redirects users to GitHub to authorize.
- Exchanges the `code` for an access token on the PHP backend.
- Fetches the GitHub user profile and stores it in a PHP session.
- Shows the logged-in username and avatar on the page.

## Requirements
- PHP 7.4+ or 8.x with cURL enabled.
- A GitHub OAuth App (Client ID & Client Secret).
- Set the following environment variables (or define them in your hosting panel):
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `APP_BASE_URL` (e.g. `http://localhost:8000` or your domain root HTTPS URL)

> **Important**: In your GitHub OAuth App settings, set the callback to:
> `${APP_BASE_URL}/public/index.html` (we use a pure front-channel flow to get the code, then POST it to `/api/login.php`). You can also use a dedicated `/public/callback.html` if you prefer; here we keep it single-file.

## Run locally (one-liner dev server)
From the project root:
```bash
php -S 0.0.0.0:8000 -t .
```
Then open http://localhost:8000/public/index.html

## Login page
- 初回は `http://localhost:8000/public/login.html` へアクセスし、GitHub ログインを開始してください。
- 認可後は自動的に `http://localhost:8000/public/index.html` に戻ります。

## Endpoints
- `POST /api/login.php` — JSON body `{ "code": "..." }`. Exchanges the code for an access token and returns `{ ok, user }`.
- `GET  /api/me.php` — Returns current user from session `{ ok, user }` or `{ ok: false }` if not logged in.
- `POST /api/logout.php` — Clears the session.

## Files
- `/public/index.html` — Main UI
- `/public/app.js` — Frontend logic (handles code, calls backend, renders user)
- `/public/styles.css` — Minimal styles
- `/api/config.php` — Loads env, starts session, helper functions & CORS
- `/api/login.php` — Code→token exchange + fetch user
- `/api/me.php` — Who am I?
- `/api/logout.php` — Logout

## Notes
- If you host API and static files on different origins, update the `ALLOWED_ORIGIN` in `config.php` (defaults to `*` for simplicity). Prefer setting your actual frontend origin in production.
- For HTTPS-only cookies/sessions, configure your web server and consider setting `session.cookie_secure=1` in `php.ini` for production.

## Setup .env

プロジェクト直下に `.env` を作成してください。

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
APP_BASE_URL=http://localhost:8000
```

`.env` を置いた後、サーバーを再起動してください。`/public/index.html` を開き、ログインボタンを押した際に `Missing GITHUB_CLIENT_ID on server.` が出なければ設定完了です。

## Create repos/issues/PRs from this app

- 本機能を使うには、GitHub OAuth App の権限で `repo` スコープが必要です。
- ログイン時の同意画面で `repo` を含む権限を許可してください。

### API Endpoints
- `POST /api/create_repo.php` — JSON: `{ name, description?, private? }`
- `POST /api/create_issue.php` — JSON: `{ owner, repo, title, body? }`
- `POST /api/create_pull_request.php` — JSON: `{ owner, repo, title, head, base, body? }`

### フロントの使い方
- ログイン後、画面下部のフォームから作成操作ができます。
- 403/404 が出る場合は、トークンの権限（`repo`）や指定した `owner/repo` の権限を確認してください。
