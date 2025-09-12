const API_BASE = location.origin + "/api";

async function getClientId() {
  try {
    const res = await fetch(`${API_BASE}/me.php?client_info=1`, { credentials: "include" });
    const json = await res.json();
    return json.github_client_id || "";
  } catch {
    return "";
  }
}

(async function main() {
  const loginBtn = document.getElementById("login-btn");
  const clientId = await getClientId();

  loginBtn.addEventListener("click", () => {
    if (!clientId) {
      alert("Missing GITHUB_CLIENT_ID on server.");
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
})();


