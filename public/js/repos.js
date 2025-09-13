(async function () {
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
        const [owner, repo] = r.full_name.split("/");
        location.href = `./repo.html?owner=${owner}&repo=${repo}`;
      });
      list.appendChild(el);
    });
  }

  let cachedRepos = [];
  let currentRepoTab = 'user'; // 'user' | 'org'
  async function loadRepos() {
    try {
      cachedRepos = await fetchReposAllPages(10);
      renderRepoList(filterRepos());
    } catch (e) {
      console.error("Failed to load repositories: " + e.message);
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

  document.getElementById("repo-filter")?.addEventListener("input", () => {
    renderRepoList(filterRepos());
  });
  document.getElementById('repo-sort')?.addEventListener('change', () => renderRepoList(filterRepos()));

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
    }
  } catch { }

})();
