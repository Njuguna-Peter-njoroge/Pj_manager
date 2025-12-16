import type { Project } from './types';

(() => {
  const role = localStorage.getItem('role');
  if (role !== 'USER') {
    window.location.href = 'auth.html';
  }
})();

function decodeJWT(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function displayUserInfo(): void {
  const token = localStorage.getItem('token');
  if (!token) return;
  const payload = decodeJWT(token);
  if (!payload) return;

  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  if (userName) userName.textContent = payload.name ?? '';
  if (userEmail) userEmail.textContent = payload.email ?? '';
}

async function fetchUserProject(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;
  const payload = decodeJWT(token);
  if (!payload?.sub) return;

  try {
    const res = await fetch(`http://localhost:3000/projects/user/${payload.sub}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      renderProjects([]);
      return;
    }

    renderProjects(data.data ? [data.data] : []);
  } catch (err: any) {
    renderProjects([]);
    console.error('Failed to load project:', err.message);
  }
}

async function fetchUserProjects(): Promise<Project[]> {
  const token = localStorage.getItem('token');
  if (!token) return [];
  const payload = decodeJWT(token);
  if (!payload?.sub) return [];

  try {
    const res = await fetch(`http://localhost:3000/projects/user/${payload.sub}/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success) return [];
    return data.data || [];
  } catch {
    return [];
  }
}

function renderProjects(projects: Project[]): void {
  const projectsGrid = document.getElementById('projectsGrid');
  if (!projectsGrid) return;

  projectsGrid.innerHTML = '';

  if (!projects.length) {
    projectsGrid.innerHTML = '<p>No project assigned.</p>';
    return;
  }

  projects.forEach(project => {
    const projectDiv = document.createElement('div');
    projectDiv.className = 'project-card';
    projectDiv.innerHTML = `
      <h3>${project.name}</h3>
      <p>${project.description || ''}</p>
      <p>Status: <strong>${project.status}</strong></p>
      <p>Start: ${new Date(project.startDate).toLocaleDateString()}</p>
      <p>End: ${new Date(project.endDate).toLocaleDateString()}</p>
      ${project.status !== 'COMPLETED' ? `<button class="btn btn-success" data-project-id="${project.id}">Mark as Completed</button>` : ''}
    `;
    projectsGrid.appendChild(projectDiv);
  });

  projectsGrid.querySelectorAll('button[data-project-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const projectId = (e.target as HTMLButtonElement).getAttribute('data-project-id');
      if (projectId) {
        await markProjectAsCompleted(projectId);
        fetchUserProject();
      }
    });
  });
}

// Render projects in the dashboard, filtered by status
async function renderFilteredProjects(): Promise<void> {
  const filter = (document.getElementById('taskStatusFilter') as HTMLSelectElement)?.value || 'all';
  const projects = await fetchUserProjects();
  let filtered = projects;
  if (filter !== 'all') {
    filtered = projects.filter(p => p.status === filter);
  }
  renderProjects(filtered);
}

// Mark project as completed
async function markProjectAsCompleted(projectId: string): Promise<void> {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  if (!token || !userId) {
    alert('Please log in again');
    window.location.href = 'auth.html';
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/projects/${projectId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to complete project');
    }

    alert('Project marked as completed! Admin has been notified.');
    await renderFilteredProjects(); 

  } catch (error) {
    console.error('Error completing project:', error);
    alert(error instanceof Error ? error.message : 'Failed to complete project');
  }
}

function setupSidebarNavigation(): void {
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.sidebar-nav a');
  const sections = document.querySelectorAll<HTMLElement>('.dashboard-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.dataset.section;
      if (!sectionId) return;

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
      });
    });
  });
}

function setupLogout(): void {
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'auth.html';
  });
}

document.addEventListener("DOMContentLoaded", () => {
  displayUserInfo();
  renderFilteredProjects();
  setupSidebarNavigation();
  setupLogout();
});
