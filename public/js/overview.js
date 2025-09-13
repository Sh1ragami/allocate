(function () {
  let collaborators = [];
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
    // ... (omitting graph and summary stats for brevity)

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

    // Kanban Board
    const kanbanBoard = document.querySelector(".kanban-board");
    const kanbanColumns = document.querySelectorAll(".kanban-column-content");
    if (kanbanColumns.length) {
      kanbanColumns.forEach(col => col.innerHTML = '');

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

      // Event listeners
      kanbanBoard.addEventListener('click', handleKanbanClick);
      kanbanBoard.addEventListener("dragstart", (e) => {
        console.log('dragstart', e.target);
        if (e.target.classList.contains("kanban-card")) {
          draggedCard = e.target;
          setTimeout(() => {
            e.target.style.display = "none";
          }, 0);
        }
      });

      kanbanBoard.addEventListener("dragend", (e) => {
        console.log('dragend', e.target);
        if (draggedCard) {
          draggedCard.style.display = "block";
          draggedCard = null;
        }
      });

      kanbanColumns.forEach(column => {
        column.addEventListener("dragover", (e) => {
          e.preventDefault(); // This is necessary to allow dropping
        });

        column.addEventListener("drop", async (e) => {
          e.preventDefault();
          console.log('drop', e.target);
          if (draggedCard) {
            const targetColumn = e.currentTarget;
            targetColumn.appendChild(draggedCard);
            const issueNumber = parseInt(draggedCard.dataset.issueNumber, 10);
            const currentLabels = JSON.parse(draggedCard.dataset.labels);
            const targetColumnId = targetColumn.parentElement.querySelector('.kanban-column-title').textContent;

            console.log(`Dropped issue #${issueNumber} into ${targetColumnId}`);

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
    collaborators = data.collaborators;
    // ... (rest of the function)
  }

  function createKanbanCard(issue) {
    const card = document.createElement("div");
    card.className = "kanban-card";
    // ... (card creation logic)

    let assigneesHTML = '<div class="kanban-card-assignees" data-issue-number="' + issue.number + '">';
    if (issue.assignees && issue.assignees.length > 0) {
      issue.assignees.forEach(assignee => {
        assigneesHTML += `<img src="${assignee.avatar_url}" class="avatar avatar-small" alt="${assignee.login}">`;
      });
    } else {
      assigneesHTML += '<span class="text-small color-fg-muted">Unassigned</span>';
    }
    assigneesHTML += '</div>';

    // ... (rest of card innerHTML)
    card.innerHTML = `
      <a href="${issue.html_url}" target="_blank" class="kanban-card-title">${issue.title}</a>
      ${assigneesHTML}
    `;
    return card;
  }

  function handleKanbanClick(e) {
    const assigneesEl = e.target.closest('.kanban-card-assignees');
    if (assigneesEl) {
      const issueNumber = assigneesEl.dataset.issueNumber;
      const dropdown = createAssigneeDropdown(issueNumber);
      assigneesEl.appendChild(dropdown);
    }
  }

  function createAssigneeDropdown(issueNumber) {
    const dropdown = document.createElement('div');
    dropdown.className = 'assignee-dropdown';
    collaborators.forEach(c => {
      const item = document.createElement('div');
      item.className = 'assignee-dropdown-item';
      item.textContent = c.login;
      item.addEventListener('click', async () => {
        const repoFullName = localStorage.getItem("selectedRepo");
        const [owner, repo] = repoFullName.split('/');
        await postJSON(`${API_BASE}/update_issue.php`, {
          owner, repo, issue_number: parseInt(issueNumber, 10),
          payload: { assignees: [c.login] }
        });
        renderDashboard(repoFullName);
      });
      dropdown.appendChild(item);
    });
    return dropdown;
  }

  // ... (rest of the file)
})();