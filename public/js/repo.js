(async function () {
  const owner = qs("owner");
  const repo = qs("repo");

  if (owner && repo) {
    document.getElementById("repo-full-name").textContent = `${owner}/${repo}`;
  }

  document.getElementById("btn-create-issue")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const title = document.getElementById("issue-title").value.trim();
    const body = document.getElementById("issue-body").value;
    if (!owner || !repo || !title) { 
      const resEl = document.getElementById("res-issue");
      if(resEl) resEl.textContent = "Owner, repo, and title are required.";
      return; 
    }
    const resEl = document.getElementById("res-issue");
    if(resEl) resEl.textContent = "Creating issue...";
    btn.disabled = true;
    try {
      const res = await postJSON(`${API_BASE}/create_issue.php`, { owner, repo, title, body });
      if(resEl) resEl.innerHTML = `Issue created: <a href="${res.issue.html_url}" target="_blank" rel="noreferrer">#${res.issue.number}</a>`;
    } catch (e) {
      if(resEl) resEl.textContent = "Create issue failed: " + e.message;
    }
    btn.disabled = false;
  });

  document.getElementById("btn-create-pr")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const title = document.getElementById("pr-title").value.trim();
    const head = document.getElementById("pr-head").value.trim();
    const base = document.getElementById("pr-base").value.trim();
    const body = document.getElementById("pr-body").value;
    if (!owner || !repo || !title || !head || !base) { 
      const resEl = document.getElementById("res-pr");
      if(resEl) resEl.textContent = "Owner, repo, title, head, and base are required.";
      return; 
    }
    const resEl = document.getElementById("res-pr");
    if(resEl) resEl.textContent = "Creating pull request...";
    btn.disabled = true;
    try {
      const res = await postJSON(`${API_BASE}/create_pull_request.php`, { owner, repo, title, head, base, body });
      if(resEl) resEl.innerHTML = `PR created: <a href="${res.pull_request.html_url}" target="_blank" rel="noreferrer">#${res.pull_request.number}</a>`;
    } catch (e) {
      if(resEl) resEl.textContent = "Create PR failed: " + e.message;
    }
    btn.disabled = false;
  });
})();
