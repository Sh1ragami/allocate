(function () {
  let collaborators = [];

  const collaboratorsList = document.getElementById('collaborators-list');
  const newCollaboratorLoginInput = document.getElementById('new-collaborator-login');
  const searchResultsContainer = document.getElementById('collaborator-search-results');

  function renderCollaborators() {
    if (!collaboratorsList) return;
    collaboratorsList.innerHTML = '';
    collaborators.forEach(login => {
      const el = document.createElement('span');
      el.className = 'Label Label--large mr-1 mb-1';
      el.innerHTML = `${login} <button class="btn-link" data-login="${login}">x</button>`;
      collaboratorsList.appendChild(el);
    });
  }

  collaboratorsList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const login = e.target.dataset.login;
      collaborators = collaborators.filter(c => c !== login);
      renderCollaborators();
    }
  });

  newCollaboratorLoginInput.addEventListener('keyup', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) {
      searchResultsContainer.innerHTML = '';
      return;
    }

    const res = await fetch(`${API_BASE}/search_users.php?q=${query}`, { credentials: 'include' });
    const data = await res.json();

    if (!res.ok) {
      searchResultsContainer.innerHTML = `<div class="color-fg-danger">Error: ${data.error}</div>`;
      return;
    }

    searchResultsContainer.innerHTML = '';
    data.users.slice(0, 5).forEach(user => {
      const el = document.createElement('div');
      el.className = 'Box-row Box-row--hover-gray p-2 d-flex flex-items-center';
      el.style.cursor = 'pointer';
      el.innerHTML = `<img src="${user.avatar_url}" class="avatar avatar-small mr-2"><span class="font-weight-bold">${user.login}</span>`;
      el.addEventListener('click', () => {
        if (!collaborators.includes(user.login)) {
          collaborators.push(user.login);
          renderCollaborators();
        }
        newCollaboratorLoginInput.value = '';
        searchResultsContainer.innerHTML = '';
      });
      searchResultsContainer.appendChild(el);
    });
  });

  document.getElementById("btn-create-repo")?.addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("repo-name").value.trim();
    const description = document.getElementById("repo-desc").value;
    const isPrivate = document.getElementById("repo-private").checked;
    const appIdea = document.getElementById("app-idea").value.trim();

    if (!name) {
      const resEl = document.getElementById("res-repo");
      if(resEl) resEl.textContent = "Repository name is required.";
      return;
    }

    const resEl = document.getElementById("res-repo");
    if(resEl) resEl.textContent = "Creating repository...";
    btn.disabled = true;

    try {
      // 1. Create repository
      const repoRes = await postJSON(`${API_BASE}/create_repo.php`, { name, description, private: isPrivate });
      const repoFullName = repoRes.repo.full_name;
      const [owner, repo] = repoFullName.split("/");

      // 2. Add collaborators
      if (collaborators.length > 0) {
        if(resEl) resEl.textContent = "Adding collaborators...";
        for (const login of collaborators) {
          await postJSON(`${API_BASE}/add_user_to_project.php`, {
            repo_full_name: repoFullName,
            user_login: login,
          });
        }
      }

      // 3. Generate and assign tasks
      if (appIdea) {
        if(resEl) resEl.textContent = "Generating tasks from your idea...";
        const tasksRes = await postJSON(`${API_BASE}/generate_tasks.php`, { app_idea: appIdea });
        const tasks = tasksRes.tasks;

        if(resEl) resEl.textContent = `Creating ${tasks.length} issues...`;

        for (const task of tasks) {
          let payload = {
            owner: owner,
            repo: repo,
            title: task
          };
          if (collaborators.length > 0) {
            const assignee = collaborators[Math.floor(Math.random() * collaborators.length)];
            payload.assignees = [assignee];
          }
          await postJSON(`${API_BASE}/create_issue.php`, payload);
        }
      }

      localStorage.setItem("selectedRepo", repoFullName);
      location.href = "./overview.html";

    } catch (e) {
      if(resEl) resEl.textContent = "An error occurred: " + e.message;
    }

    btn.disabled = false;
  });
})();