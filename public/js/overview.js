(function () {
  const emptyView = document.getElementById("empty-view");
  const dashboardView = document.getElementById("dashboard-view");
  const projectNameEl = document.getElementById("project-name");
  const clearProjectBtn = document.getElementById("clear-project-btn");

  const selectedRepo = localStorage.getItem("selectedRepo");

  if (selectedRepo) {
    showDashboard(selectedRepo);
  } else {
    showEmptyView();
  }

  function showDashboard(repoName) {
    if (emptyView) emptyView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "block";
    if (projectNameEl) projectNameEl.textContent = repoName;
    renderDashboard(repoName);
    renderCollaborators(repoName);
  }

  function showEmptyView() {
    if (emptyView) emptyView.style.display = "block";
    if (dashboardView) dashboardView.style.display = "none";
  }

  if (clearProjectBtn) {
    clearProjectBtn.addEventListener("click", () => {
      localStorage.removeItem("selectedRepo");
      showEmptyView();
    });
  }

  async function renderDashboard(repoName, collaboratorLogin = 'all') {
    // Contribution Graph
    const graph = document.getElementById("contribution-graph");
    if (graph) {
      const [owner, repo] = repoName.split("/");
      const activityRes = await fetch(`${API_BASE}/get_commit_activity.php?owner=${owner}&repo=${repo}`, { credentials: "include" });
      const activityData = await activityRes.json();
      if (activityRes.ok) {
        renderContributionGraph(graph, activityData.activity);
      }
    }

    // Fetch issues and PRs
    const [owner, repo] = repoName.split("/");
    const res = await fetch(`${API_BASE}/list_issues.php?owner=${owner}&repo=${repo}`, { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to fetch issues:", data.error);
      return;
    }

    let issues = data.issues;

    if (collaboratorLogin !== 'all') {
        issues = issues.filter(issue => issue.assignees.some(assignee => assignee.login === collaboratorLogin));
    }


    const openIssues = issues.filter(i => i.state === 'open' && !i.pull_request);
    const openPRs = issues.filter(i => i.state === 'open' && i.pull_request);

    // Summary Stats
    const summaryStats = document.getElementById("summary-stats");
    if (summaryStats) {
      summaryStats.innerHTML = `
        <div class="d-flex flex-justify-between mb-2">
          <span>Open Issues</span>
          <span class="Label">${openIssues.length}</span>
        </div>
        <div class="d-flex flex-justify-between">
          <span>Open Pull Requests</span>
          <span class="Label">${openPRs.length}</span>
        </div>
      `;
    }

    // Kanban Board
    const kanbanColumns = document.querySelectorAll(".kanban-column-content");
    if (kanbanColumns.length) {
      kanbanColumns.forEach(col => col.innerHTML = ''); // Clear columns

      const todoCol = kanbanColumns[0];
      const inprogressCol = kanbanColumns[1];
      const doneCol = kanbanColumns[2];

      issues.forEach(issue => {
        const card = createKanbanCard(issue);
        if (issue.state === 'closed') {
          doneCol.appendChild(card);
        } else {
          const labels = issue.labels.map(l => l.name.toLowerCase());
          if (labels.includes('in progress') || labels.includes('wip')) {
            inprogressCol.appendChild(card);
          } else {
            todoCol.appendChild(card);
          }
        }
      });

      // Drag and drop event listeners
      let draggedCard = null;

      document.addEventListener("dragstart", (e) => {
        if (e.target.classList.contains("kanban-card")) {
          draggedCard = e.target;
          setTimeout(() => {
            e.target.style.display = "none";
          }, 0);
        }
      });

      document.addEventListener("dragend", (e) => {
        if (draggedCard) {
          draggedCard.style.display = "block";
          draggedCard = null;
        }
      });

      kanbanColumns.forEach(column => {
        column.addEventListener("dragover", (e) => {
          e.preventDefault();
        });

        column.addEventListener("drop", async (e) => {
          e.preventDefault();
          if (draggedCard) {
            const targetColumn = e.currentTarget;
            targetColumn.appendChild(draggedCard);
            const issueNumber = parseInt(draggedCard.dataset.issueNumber, 10);
            const currentLabels = JSON.parse(draggedCard.dataset.labels);
            const targetColumnId = targetColumn.parentElement.querySelector('.kanban-column-title').textContent;

            let payload = {};
            if (targetColumnId === 'Done') {
              payload = { state: 'closed' };
            } else {
              let newLabels = currentLabels.filter(l => l.toLowerCase() !== 'in progress' && l.toLowerCase() !== 'wip');
              if (targetColumnId === 'In Progress') {
                newLabels.push('in progress');
              }
              payload = { state: 'open', labels: newLabels };
            }

            await postJSON(`${API_BASE}/update_issue.php`, {
              owner,
              repo,
              issue_number: issueNumber,
              payload
            });
          }
        });
      });
    }
  }

  async function renderCollaborators(repoName) {
    const collaboratorsList = document.getElementById("collaborators-list");
    const collaboratorFilter = document.getElementById("collaborator-filter");

    if (!collaboratorsList || !collaboratorFilter) return;

    const res = await fetch(`${API_BASE}/list_collaborators.php?repo_full_name=${repoName}`, { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to fetch collaborators:", data.error);
      return;
    }

    collaboratorsList.innerHTML = "";
    // Clear previous options except the first one
    while (collaboratorFilter.options.length > 1) {
        collaboratorFilter.remove(1);
    }

    data.collaborators.forEach(c => {
      const el = document.createElement("div");
      el.className = "d-flex flex-items-center mb-2";
      el.innerHTML = `
        <img src="${c.avatar_url}" class="avatar mr-2" alt="${c.login}">
        <div>
          <div class="font-weight-bold">${c.login}</div>
          <div class="text-small color-fg-muted">${c.role}</div>
        </div>
      `;
      collaboratorsList.appendChild(el);

      const option = document.createElement('option');
      option.value = c.login;
      option.textContent = c.login;
      collaboratorFilter.appendChild(option);
    });
  }

  function createKanbanCard(issue) {
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.setAttribute("draggable", "true");
    card.dataset.issueNumber = issue.number;
    card.dataset.labels = JSON.stringify(issue.labels.map(l => l.name));

    let assigneesHTML = '';
    if (issue.assignees && issue.assignees.length > 0) {
      assigneesHTML = '<div class="kanban-card-assignees">';
      issue.assignees.forEach(assignee => {
        assigneesHTML += `<img src="${assignee.avatar_url}" class="avatar avatar-small" alt="${assignee.login}">`;
      });
      assigneesHTML += '</div>';
    }

    card.innerHTML = `
      <a href="${issue.html_url}" target="_blank" class="kanban-card-title">${issue.title}</a>
      <div class="kanban-card-meta">
        #${issue.number} opened by ${issue.user.login}
      </div>
      ${assigneesHTML}
    `;
    return card;
  }

  function renderContributionGraph(graph, activity) {
    graph.innerHTML = ''; // Clear previous graph
    if (!activity || activity.length === 0) {
      graph.textContent = "No commit activity found for the last year.";
      return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "150");
    svg.setAttribute("viewBox", `0 0 520 150`);

    const maxCommits = Math.max(...activity.map(w => w.total));

    activity.forEach((week, i) => {
      const barHeight = maxCommits > 0 ? (week.total / maxCommits) * 120 : 0;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", i * 10);
      rect.setAttribute("y", 150 - barHeight);
      rect.setAttribute("width", 8);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("fill", "#39d353");
      svg.appendChild(rect);
    });

    graph.appendChild(svg);
  }

  document.getElementById('add-collaborator-btn')?.addEventListener('click', async () => {
    const userLoginInput = document.getElementById('new-collaborator-login');
    const userLogin = userLoginInput.value.trim();
    if (!userLogin) return;

    const repoFullName = localStorage.getItem("selectedRepo");
    if (!repoFullName) return;

    try {
      await postJSON(`${API_BASE}/add_user_to_project.php`, {
        repo_full_name: repoFullName,
        user_login: userLogin,
      });
      userLoginInput.value = '';
      renderCollaborators(repoFullName);
    } catch (e) {
      alert('Error adding collaborator: ' + e.message);
    }
  });

  document.getElementById('collaborator-filter')?.addEventListener('change', (e) => {
    const selectedCollaborator = e.target.value;
    const repoFullName = localStorage.getItem("selectedRepo");
    if (repoFullName) {
        renderDashboard(repoFullName, selectedCollaborator);
    }
  });

})();
