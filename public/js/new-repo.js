(async function () {
  document.getElementById("btn-create-repo")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("repo-name").value.trim();
    const description = document.getElementById("repo-desc").value;
    const isPrivate = document.getElementById("repo-private").checked;
    if (!name) { 
      const resEl = document.getElementById("res-repo");
      if(resEl) resEl.textContent = "Repository name is required.";
      return; 
    }
    const resEl = document.getElementById("res-repo");
    if(resEl) resEl.textContent = "Creating repository...";
    btn.disabled = true;
    try {
      const res = await postJSON(`${API_BASE}/create_repo.php`, { name, description, private: isPrivate });
      if(resEl) resEl.innerHTML = `Repo created: <a href="${res.repo.html_url}" target="_blank" rel="noreferrer">${res.repo.full_name}</a>`;
    } catch (e) {
      if(resEl) resEl.textContent = "Create repo failed: " + e.message;
    }
    btn.disabled = false;
  });
})();
