// ============ Config ============
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
  const headerUser = document.getElementById("header-user");
  if (!user) {
    if (headerUser) headerUser.innerHTML = `<a href="/public/login.html" class="btn">Login with GitHub</a>`;
    return;
  }
  const login = user.login || user.name || "(unknown)";
  const avatar = user.avatar_url ? `<img class="avatar" src="${user.avatar_url}" alt="avatar" />` : "";
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
  // Check session
  try {
    const me = await fetch(`${API_BASE}/me.php`, { credentials: "include" }).then(r => r.json());
    if (me && me.user) {
      renderUser(me.user);
      // auto-fill owner fields
      const owner = me.user.login || me.user.name || "";
      const ids = ["issue-owner", "pr-owner"];
      ids.forEach(id => { const el = document.getElementById(id); if (el && !el.value) el.value = owner; });
    } else {
      renderUser(null);
    }
  } catch (e) {
    renderUser(null);
  }

  // Get client_id from server (exposed safely for front-channel auth URL)
  const clientInfo = await fetch(`${API_BASE}/me.php?client_info=1`).then(r => r.json()).catch(() => ({}));
  const clientId = clientInfo.github_client_id || "";

  // Handle code from GitHub
  const code = qs("code");
  const state = qs("state");
  if (code) {
    const expect = sessionStorage.getItem("oauth_state");
    if (expect && state && expect !== state) {
      console.error("Invalid OAuth state. Try again.");
      return;
    }
    try {
      const result = await postJSON(`${API_BASE}/login.php`, { code });
      renderUser(result.user);
      // Remove code from the URL
      const url = new URL(location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      history.replaceState(null, "", url.toString());
      location.href = url.pathname;
    } catch (e) {
      console.error("Login failed: " + e.message);
    }
  }

  // Logout
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
      await postJSON(`${API_BASE}/logout.php`, {});
      renderUser(null);
      // redirect to login after logout
      location.href = location.origin + "/public/login.html";
    } catch (e) {
      console.error("Logout failed: " + e.message);
    }
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

  // Highlight active header link
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".Header-link").forEach(link => {
    const linkPage = link.getAttribute("href").split("/").pop();
    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });

})();
