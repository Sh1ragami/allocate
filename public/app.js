// ============ Config ============
// We fetch server-side env via /api/me.php, but we also need the client_id to build the authorize URL.
// We'll get the client_id from the server by asking /api/me.php with a special flag (no auth required).
// Alternatively, hard-code your client_id here for a single-origin deployment.
const API_BASE = location.origin + "/api";

// ============ Helpers ============
function qs(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

function setMessage(text) {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = text || "";
}

function renderUser(user) {
  const sidebar = document.getElementById("user-info");
  const headerUser = document.getElementById("header-user");
  if (!user) {
    if (sidebar) sidebar.innerHTML = "";
    if (headerUser) headerUser.innerHTML = `<button id="login-btn" class="btn">Login with GitHub</button>`;
    return;
  }
  const login = user.login || user.name || "(unknown)";
  const avatar = user.avatar_url ? `<img class="avatar" src="${user.avatar_url}" alt="avatar" />` : "";
  if (sidebar) {
    sidebar.innerHTML = `${user.avatar_url ? `<img src="${user.avatar_url}" alt="avatar" />` : ""}<div><div class="name">${login}</div><div class="meta">${user.html_url ? `<a href="${user.html_url}" target="_blank" rel="noreferrer">@${user.login}</a>` : ""}</div></div>`;
  }
  if (headerUser) {
    headerUser.innerHTML = `${avatar}<span class="name">${login}</span><button id="logout-btn" class="btn btn-secondary">Logout</button>`;
  }
}

// Simple POST helper
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

// ============ Main ============
(async function main() {
  setMessage("Checking session...");
  // Check session
  try {
    const me = await fetch(`${API_BASE}/me.php`, { credentials: "include" }).then(r => r.json());
    if (me && me.user) {
      renderUser(me.user);
      setMessage("Logged in");
      // auto-fill owner fields
      const owner = me.user.login || me.user.name || "";
      const ids = ["issue-owner", "pr-owner"];
      ids.forEach(id => { const el = document.getElementById(id); if (el && !el.value) el.value = owner; });
    } else {
      setMessage("Not logged in");
    }
  } catch (e) {
    setMessage("Not logged in");
  }

  // Get client_id from server (exposed safely for front-channel auth URL)
  const clientInfo = await fetch(`${API_BASE}/me.php?client_info=1`).then(r => r.json()).catch(() => ({}));
  const clientId = clientInfo.github_client_id || "";
  let currentUserLogin = null;
  try {
    const me2 = await fetch(`${API_BASE}/me.php`, { credentials: "include" }).then(r => r.json());
    currentUserLogin = me2 && me2.user ? me2.user.login : null;
  } catch { }

  function attachLoginHandler() {
    const loginBtnDyn = document.getElementById("login-btn");
    if (!loginBtnDyn) return;
    loginBtnDyn.addEventListener("click", () => {
      if (!clientId) {
        setMessage("Missing GITHUB_CLIENT_ID on server.");
        return;
      }
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", clientId);
      authorize.searchParams.set("scope", "read:user user:email repo");
      authorize.searchParams.set("redirect_uri", location.origin + "/public/index.html");
      const state = Math.random().toString(36).slice(2);
      sessionStorage.setItem("oauth_state", state);
      authorize.searchParams.set("state", state);
      location.href = authorize.toString();
    });
  }

  attachLoginHandler();

  const loginBtn = document.getElementById("login-btn");
  loginBtn?.addEventListener("click", () => {
    if (!clientId) {
      setMessage("Missing GITHUB_CLIENT_ID on server.");
      return;
    }
    // Build authorize URL (scope can be adjusted as needed)
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    // Need repo scope for creating repos/issues/PRs
    authorize.searchParams.set("scope", "read:user user:email repo");
    // redirect back to this page
    authorize.searchParams.set("redirect_uri", location.origin + "/public/index.html");
    // optional: state to mitigate CSRF
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem("oauth_state", state);
    authorize.searchParams.set("state", state);
    location.href = authorize.toString();
  });

  // Handle code from GitHub
  const code = qs("code");
  const state = qs("state");
  if (code) {
    const expect = sessionStorage.getItem("oauth_state");
    if (expect && state && expect !== state) {
      setMessage("Invalid OAuth state. Try again.");
      return;
    }
    setMessage("Exchanging code...");
    try {
      const result = await postJSON(`${API_BASE}/login.php`, { code });
      renderUser(result.user);
      setMessage("Logged in as " + (result.user.login || result.user.name || ""));
      // Remove code from the URL
      const url = new URL(location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      history.replaceState(null, "", url.toString());
    } catch (e) {
      setMessage("Login failed: " + e.message);
    }
  }

  // Logout
  document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
      await postJSON(`${API_BASE}/logout.php`, {});
      renderUser(null);
      // redirect to login after logout
      location.href = location.origin + "/public/login.html";
    } catch (e) {
      setMessage("Logout failed: " + e.message);
    }
  });

  // Create repo
  document.getElementById("btn-create-repo")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("repo-name").value.trim();
    const description = document.getElementById("repo-desc").value;
    const isPrivate = document.getElementById("repo-private").checked;
    if (!name) { setMessage("repo name required"); return; }
    setMessage("Creating repository...");
    btn.disabled = true;
    try {
      const res = await postJSON(`${API_BASE}/create_repo.php`, { name, description, private: isPrivate });
      setMessage(`Repo created: ${res.repo.full_name}`);
      const el = document.getElementById("res-repo");
      if (el) el.innerHTML = res.repo.html_url ? `<a href="${res.repo.html_url}" target="_blank" rel="noreferrer">Open</a>` : "";
    } catch (e) {
      setMessage("Create repo failed: " + e.message);
    }
    btn.disabled = false;
  });

  // Create issue
  document.getElementById("btn-create-issue")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const owner = document.getElementById("issue-owner").value.trim();
    const repo = document.getElementById("issue-repo").value.trim();
    const title = document.getElementById("issue-title").value.trim();
    const body = document.getElementById("issue-body").value;
    if (!owner || !repo || !title) { setMessage("owner/repo/title required"); return; }
    setMessage("Creating issue...");
    btn.disabled = true;
    try {
      const res = await postJSON(`${API_BASE}/create_issue.php`, { owner, repo, title, body });
      setMessage(`Issue created: #${res.issue.number}`);
      const el = document.getElementById("res-issue");
      if (el) el.innerHTML = res.issue.html_url ? `<a href="${res.issue.html_url}" target="_blank" rel="noreferrer">Open</a>` : "";
    } catch (e) {
      setMessage("Create issue failed: " + e.message);
    }
    btn.disabled = false;
  });

  // Create PR
  document.getElementById("btn-create-pr")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const owner = document.getElementById("pr-owner").value.trim();
    const repo = document.getElementById("pr-repo").value.trim();
    const title = document.getElementById("pr-title").value.trim();
    const head = document.getElementById("pr-head").value.trim();
    const base = document.getElementById("pr-base").value.trim();
    const body = document.getElementById("pr-body").value;
    if (!owner || !repo || !title || !head || !base) { setMessage("owner/repo/title/head/base required"); return; }
    setMessage("Creating pull request...");
    btn.disabled = true;
    try {
      const res = await postJSON(`${API_BASE}/create_pull_request.php`, { owner, repo, title, head, base, body });
      setMessage(`PR created: #${res.pull_request.number}`);
      const el = document.getElementById("res-pr");
      if (el) el.innerHTML = res.pull_request.html_url ? `<a href="${res.pull_request.html_url}" target="_blank" rel="noreferrer">Open</a>` : "";
    } catch (e) {
      setMessage("Create PR failed: " + e.message);
    }
    btn.disabled = false;
  });

  // ====== Repo list ======
  async function fetchReposAllPages(maxPages = 10) {
    const all = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await fetch(`${API_BASE}/list_repos.php?per_page=100&page=${page}`, { credentials: "include" });
      if (!res.ok) break;
      const json = await res.json().catch(() => ({}));
      if (!json || !Array.isArray(json.repos) || json.repos.length === 0) break;
      all.push(...json.repos);
      if (json.repos.length < 100) break;
    }
    return all;
  }

  function renderRepoList(repos) {
    const list = document.getElementById("repo-list");
    if (!list) return;
    list.innerHTML = "";
    list.className = "Box";
    repos.forEach(r => {
      const el = document.createElement("div");
      el.className = "Box-row d-flex flex-items-center flex-justify-between repo-item";
      const lang = (r.language || '').toLowerCase();
      const langColor = lang ? '#238636' : '#57606a';
      el.innerHTML = `
        <div>
          <div class="d-flex flex-items-center">
            <span class="octicon octicon-repo mr-2" aria-hidden="true"></span>
            <span class="repo-name color-fg-default">${r.name || r.full_name}</span>
            ${r.private ? '<span class="Label ml-2">Private</span>' : '<span class="Label ml-2">Public</span>'}
          </div>
          <div class="repo-meta">
            <span class="lang-dot" style="background:${langColor}"></span>${r.language || ''}
            · Updated ${new Date(r.updated_at).toLocaleDateString()}
          </div>
        </div>
        <div class="repo-meta">
          ★ ${r.stargazers_count}
        </div>`;
      el.addEventListener("click", () => {
        // fill owner/repo in forms
        const [owner, repo] = r.full_name.split("/");
        const io = document.getElementById("issue-owner"); if (io) io.value = owner;
        const ir = document.getElementById("issue-repo"); if (ir) ir.value = repo;
        const po = document.getElementById("pr-owner"); if (po) po.value = owner;
        const pr = document.getElementById("pr-repo"); if (pr) pr.value = repo;
        // selected
        const sel = document.getElementById("selected-repo-name");
        if (sel) sel.textContent = r.full_name;
        const ghPanel = document.getElementById('gh-actions');
        if (ghPanel) ghPanel.classList.remove('hidden');
        // switch to full-width action view
        document.querySelector('.layout')?.classList.add('view-actions');
      });
      list.appendChild(el);
    });
  }

  let cachedRepos = [];
  let currentRepoTab = 'user'; // 'user' | 'org'
  async function loadRepos() {
    setMessage("Loading repositories...");
    try {
      cachedRepos = await fetchReposAllPages(10);
      renderRepoList(filterRepos());
      setMessage(`Loaded ${cachedRepos.length} repositories`);
    } catch (e) {
      setMessage("Failed to load repositories: " + e.message);
    }
  }

  function filterRepos() {
    const q = (document.getElementById("repo-filter")?.value || "").toLowerCase();
    let list = cachedRepos
      .filter(r => {
        const isOrg = r.owner && r.owner.type === 'Organization';
        const matchTab = currentRepoTab === 'org' ? isOrg : !isOrg;
        return matchTab;
      })
      .filter(r => r.full_name.toLowerCase().includes(q));
    // sort
    const sort = document.getElementById('repo-sort')?.value || 'updated';
    list.sort((a, b) => {
      if (sort === 'full_name') return a.full_name.localeCompare(b.full_name);
      if (sort === 'created') return new Date(b.created_at) - new Date(a.created_at);
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
    return list;
  }

  document.getElementById("reload-repos")?.addEventListener("click", loadRepos);
  document.getElementById("repo-filter")?.addEventListener("input", () => {
    renderRepoList(filterRepos());
  });
  document.getElementById('repo-sort')?.addEventListener('change', () => renderRepoList(filterRepos()));
  document.getElementById("clear-selected-repo")?.addEventListener("click", () => {
    const ids = ["issue-owner", "issue-repo", "pr-owner", "pr-repo"]; ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    const sel = document.getElementById("selected-repo-name"); if (sel) sel.textContent = "(none)";
    const ghPanel = document.getElementById('gh-actions');
    if (ghPanel) ghPanel.classList.add('hidden');
    document.querySelector('.layout')?.classList.remove('view-actions');
  });

  document.getElementById('btn-new-repo-entry')?.addEventListener('click', () => {
    const ghPanel = document.getElementById('gh-actions');
    if (ghPanel) ghPanel.classList.remove('hidden');
    document.querySelector('.layout')?.classList.add('view-actions');
    document.querySelectorAll('#actions-tabs .tab').forEach(b => b.classList.remove('active'));
    document.querySelector('#actions-tabs .tab[data-panel="panel-repo"]')?.classList.add('active');
    document.querySelectorAll('.actions-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-repo')?.classList.add('active');
  });

  document.querySelectorAll('#actions-tabs .UnderlineNav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#actions-tabs .UnderlineNav-item').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const panel = btn.getAttribute('data-panel');
      document.querySelectorAll('.actions-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(panel)?.classList.add('active');
    });
  });

  // Back to list
  document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
    const ghPanel = document.getElementById('gh-actions');
    if (ghPanel) ghPanel.classList.add('hidden');
    document.querySelector('.layout')?.classList.remove('view-actions');
    // keep selected name; forms remain filled
  });

  // Main tabs (Repositories / Progress)
  document.querySelectorAll('#main-tabs .UnderlineNav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#main-tabs .UnderlineNav-item').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const view = btn.getAttribute('data-view');
      const colRepos = document.getElementById('col-repos');
      const colProg = document.getElementById('col-progress');
      if (view === 'progress') {
        if (colRepos) colRepos.style.display = 'none';
        if (colProg) colProg.style.display = '';
        renderProgress();
      } else {
        if (colRepos) colRepos.style.display = '';
        if (colProg) colProg.style.display = 'none';
      }
    });
  });

  // Tabs
  document.querySelectorAll('#repo-tabs .UnderlineNav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#repo-tabs .UnderlineNav-item').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentRepoTab = btn.getAttribute('data-tab');
      renderRepoList(filterRepos());
    });
  });

  // Auto load repos after login
  try {
    const me3 = await fetch(`${API_BASE}/me.php`, { credentials: "include" }).then(r => r.json());
    if (me3 && me3.user) {
      loadRepos();
      renderProgress();
    }
  } catch { }

  // ---- Progress view ----
  function renderProgress() {
    // stats mock: counts by activity in last 7 days from cachedRepos updated_at
    const stats = { active: 0, idle: 0 };
    const now = Date.now();
    cachedRepos.forEach(r => {
      const updated = new Date(r.updated_at).getTime();
      if (now - updated < 7 * 24 * 60 * 60 * 1000) stats.active++; else stats.idle++;
    });
    const statsEl = document.getElementById('progress-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="Label Label--success mr-2">Active: ${stats.active}</span>
        <span class="Label mr-2">Idle: ${stats.idle}</span>
      `;
    }
    const heat = document.getElementById('progress-heatmap');
    if (heat) {
      // simple 7x10 grid as placeholder heatmap
      const days = 70; const cells = [];
      for (let i = 0; i < days; i++) {
        const lvl = Math.floor(Math.random() * 4); // placeholder intensity
        const c = ['#0e4429', '#006d32', '#26a641', '#39d353'][lvl];
        cells.push(`<span style="display:inline-block;width:10px;height:10px;margin:1px;background:${c};border-radius:2px"></span>`);
      }
      heat.innerHTML = `<div style="display:flex;flex-wrap:wrap;max-width:130px">${cells.join('')}</div>`;
    }
  }
})();