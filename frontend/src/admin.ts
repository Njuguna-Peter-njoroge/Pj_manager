import  { User, Project, AdminProfile } from './types';

let adminProfile: AdminProfile | null = null;
let users: User[] = [];
let projects: Project[] = [];

const sections = [
  { id: "overview", title: "Overview", icon: "fas fa-tachometer-alt" },
  { id: "users", title: "Users", icon: "fas fa-users" },
  { id: "projects", title: "Projects", icon: "fas fa-project-diagram" },
  { id: "settings", title: "Settings", icon: "fas fa-cog" }
];

function checkAuth(): void {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'ADMIN') {
    localStorage.clear();
    window.location.href = 'auth.html';
  }
}

async function fetchAdminProfile(): Promise<void> {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    window.location.href = 'auth.html';
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch profile');

    const data = await response.json();
    adminProfile = data.data;

    if (!adminProfile) {
      throw new Error('No profile data received');
    }

    const nameElement = document.getElementById('adminName');
    const emailElement = document.getElementById('adminEmail');
    const userInfoElement = document.querySelector('.user-info');

    if (nameElement && emailElement && userInfoElement) {
      nameElement.textContent = adminProfile.name;
      emailElement.textContent = adminProfile.email;
      
      let profileImage = userInfoElement.querySelector('.profile-image') as HTMLImageElement;
      if (!profileImage) {
        profileImage = document.createElement('img');
        profileImage.className = 'profile-image';
        profileImage.alt = 'Admin profile';
        profileImage.style.cursor = 'pointer';
        userInfoElement.prepend(profileImage);
      }
      
      profileImage.src = adminProfile.profileImage || './assets/images/default-avatar.png';
    }

  } catch (error) {
    console.error('Error fetching admin profile:', error);
  }
}

async function fetchUsers(): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("http://localhost:3000/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch users");
    }

    users = data.data.filter((user: { role: string }) => user.role === "USER");
    renderUsers();
  } catch (err: any) {
    users = [];
    renderUsers();
    console.error("Failed to load users:", err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addProjectBtn = document.getElementById('addProjectBtn') as HTMLButtonElement;
  const formContainer = document.getElementById('projectFormContainer') as HTMLDivElement;
  const cancelBtn = document.getElementById('cancelProjectBtn') as HTMLButtonElement;
  const projectForm = document.getElementById('projectForm') as HTMLFormElement;

  if (addProjectBtn && formContainer && cancelBtn && projectForm) {
    addProjectBtn.addEventListener('click', () => {
      formContainer.classList.remove('hidden');
      populateUserDropdown();
    });

    cancelBtn.addEventListener('click', () => {
      formContainer.classList.add('hidden');
      projectForm.reset();
    });

    projectForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = (document.getElementById('projectName') as HTMLInputElement).value;
      const assigneeId = (document.getElementById('projectAssignee') as HTMLSelectElement).value;
      const status = (document.getElementById('projectStatus') as HTMLSelectElement).value;

      console.log({ name, assigneeId, status });

      formContainer.classList.add('hidden');
      projectForm.reset();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
  populateUserDropdown();      
  fetchAndRenderProjects();    
});

});

document.addEventListener('DOMContentLoaded', () => {

  const projectForm = document.getElementById("projectForm") as HTMLFormElement;
  if (projectForm) {
    projectForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const token = localStorage.getItem("token");
      if (!token) return;

      const name = (document.getElementById("projectName") as HTMLInputElement).value;
      const assigneeId = (document.getElementById("projectAssignee") as HTMLSelectElement).value || null;
      const endDateInput = document.getElementById("projectEndDate") as HTMLInputElement | null;

      if (!endDateInput) {
        alert("End date field is missing in the form.");
        return;
      }

      const endDateValue = endDateInput.value;

      if (!endDateValue) {
        alert("End date is required.");
        endDateInput.focus();
        return;
      }
      const endDateISO = new Date(endDateValue).toISOString();

      const payload: Record<string, any> = {
        name,
        assigneeId: assigneeId || undefined,
        endDate: endDateISO,
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      const res = await fetch("http://localhost:3000/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create project");
        return;
      }

      alert("Project created successfully");
      projectForm.reset();
      const projectFormContainer = document.getElementById("projectFormContainer") as HTMLDivElement;
      if (projectFormContainer) {
        projectFormContainer.classList.add("hidden");
      }
      fetchProjects(); 
    });
  }
});

async function populateUserDropdown(): Promise<void> {
  const select = document.getElementById("projectAssignee") as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = `<option value="">Select User</option>`;

  users.forEach((user: { id: string; name: string; email: string }) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.name} (${user.email})`;
    select.appendChild(option);
  });
}


async function fetchProjects(): Promise<void> {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch('http://localhost:3000/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch projects');

    const data = await response.json();
    projects = data.data;
    renderProjects();
    updateStats();

  } catch (error) {
    console.error('Error fetching projects:', error);
  }
}

function renderUsers(): void {
  const tbody = document.querySelector('#usersTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="user-cell">
          <img src="${user.profileImage || './assets/images/default-avatar.png'}" alt="${user.name}" class="user-avatar">
          ${user.name}
        </div>
      </td>
      <td>${user.email}</td>
      <td><span class="badge ${user.role.toLowerCase()}">${user.role}</span></td>
      <td><span class="badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn btn-small btn-outline" onclick="viewUserProjects('${user.id}')">
          View Projects
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProjects(): void {
  const tbody = document.querySelector('#projectsTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  projects.forEach(project => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${project.name}</td>
      <td>
        <select class="user-assign-select" data-project-id="${project.id}">
          <option value="">Unassigned</option>
          ${users.map(user => `
            <option value="${user.id}" ${project.assignee?.id === user.id ? 'selected' : ''}>
              ${user.name}
            </option>
          `).join('')}
        </select>
      </td>
      <td><span class="badge status-${project.status.toLowerCase()}">${project.status}</span></td>
      <td>${new Date(project.startDate).toLocaleDateString()}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-small btn-outline" onclick="editProject('${project.id}')">
            Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="deleteProject('${project.id}')">
            Delete
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    const select = tr.querySelector('.user-assign-select') as HTMLSelectElement;
    select?.addEventListener('change', (e) => {
      const userId = (e.target as HTMLSelectElement).value;
      assignProject(project.id, userId);
    });
  });
}

async function populateUserOptions() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch("http://localhost:3000/api/users", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const users = await res.json();
  const select = document.getElementById("projectAssignee") as HTMLSelectElement;
  users.forEach((user: any) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.email;
    select.appendChild(option);
  });
}


function updateStats(): void {
  const totalUsersEl = document.getElementById('totalUsers');
  const totalProjectsEl = document.getElementById('totalProjects');
  const activeProjectsEl = document.getElementById('activeProjects');

  if (totalUsersEl) totalUsersEl.textContent = users.length.toString();
  if (totalProjectsEl) totalProjectsEl.textContent = projects.length.toString();
  if (activeProjectsEl) {
    activeProjectsEl.textContent = projects.filter(p => p.status === 'IN_PROGRESS').length.toString();
  }
}

async function assignProject(projectId: string, userId: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {

    const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        assigneeId: userId || null 
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to assign project');
    }

    await fetchProjects(); 
    alert(data.message || (userId ? 'Project assigned successfully' : 'Project unassigned successfully'));

  } catch (error) {
    console.error('Error assigning project:', error);
    alert(error instanceof Error ? error.message : 'Failed to assign project');
  }
}

function renderNavigation(): void {
  const nav = document.querySelector('.sidebar-nav ul');
  if (!nav) return;

  nav.innerHTML = sections.map(section => `
    <li>
      <a href="#${section.id}" data-section="${section.id}" class="${section.id === 'overview' ? 'active' : ''}">
        <i class="${section.icon}"></i>
        ${section.title}
      </a>
    </li>
  `).join('');

  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', handleNavigation);
  });
}

function handleNavigation(e: Event): void {
  e.preventDefault();
  const link = e.currentTarget as HTMLAnchorElement;
  const sectionId = link.dataset.section;

  if (!sectionId || !document.getElementById(sectionId)) return;

  window.history.pushState({}, '', `#${sectionId}`);

  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  link.classList.add('active');

  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.toggle('active', section.id === sectionId);
  });

  switch (sectionId) {
    case 'users':
      fetchUsers();
      break;
    case 'projects':
      fetchProjects();
      break;
    case 'settings':
      loadAdminSettings();
      break;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavigation();

  const currentHash = window.location.hash.replace('#', '') || 'overview';
  const defaultLink = document.querySelector(`.sidebar-nav a[data-section="${currentHash}"]`);
  if (defaultLink) {
    (defaultLink as HTMLElement).click();
  }
});


async function loadAdminSettings(): Promise<void> {
  if (!adminProfile) return;

  try {

    const nameInput = document.getElementById('adminFullName') as HTMLInputElement;
    const emailInput = document.getElementById('adminEmailInput') as HTMLInputElement;

    if (nameInput && emailInput) {
      nameInput.value = adminProfile.name;
      emailInput.value = adminProfile.email;
    }

    const form = document.getElementById('adminSettingsForm') as HTMLFormElement;
    if (form && !form.dataset.handlerAdded) {
      form.addEventListener('submit', handleSettingsSubmit);
      form.dataset.handlerAdded = 'true';
    }

  } catch (error) {
    console.error('Error loading admin settings:', error);
  }
}

async function handleSettingsSubmit(e: Event): Promise<void> {
  e.preventDefault();
  
  const form = e.target as HTMLFormElement;
  const nameInput = form.querySelector('#adminFullName') as HTMLInputElement;
  const emailInput = form.querySelector('#adminEmailInput') as HTMLInputElement;
  const currentPasswordInput = form.querySelector('#currentPassword') as HTMLInputElement;
  const newPasswordInput = form.querySelector('#newPassword') as HTMLInputElement;

  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (!token || !userId) return;

  const payload: Record<string, string> = {
    name: nameInput.value,
    email: emailInput.value,
  };

  if (currentPasswordInput.value && newPasswordInput.value) {
    payload.currentPassword = currentPasswordInput.value;
    payload.newPassword = newPasswordInput.value;
  }

  try {
    const response = await fetch(`http://localhost:3000/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update settings');
    }

    alert('Settings updated successfully');
    
    currentPasswordInput.value = '';
    newPasswordInput.value = '';

    await fetchAdminProfile();

  } catch (error) {
    console.error('Error updating settings:', error);
    alert(error instanceof Error ? error.message : 'Failed to update settings');
  }
}

async function handleProfileImageUpload(file: File): Promise<void> {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`http://localhost:3000/users/${userId}/profile-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload image');

    const data = await response.json();
    
    if (adminProfile && data.data.profileImage) {
      adminProfile.profileImage = data.data.profileImage;
      
      const profileImageElement = document.querySelector('.profile-image') as HTMLImageElement;
      if (profileImageElement) {
        profileImageElement.src = adminProfile.profileImage || './assets/images/default-avatar.png';
      }
    }

  } catch (error) {
    console.error('Error uploading profile image:', error);
    alert('Failed to upload profile image');
  }
}

function setupProfileImageUpload(): void {
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.style.display = 'none';
  document.body.appendChild(imageInput);

  imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      handleProfileImageUpload(file);
    }
  });

  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('profile-image')) {
      imageInput.click();
    }
  });
}

function handleLogout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  localStorage.removeItem('userEmail');
  window.location.href = 'auth.html';
}

(window as any).viewUserProjects = function(userId: string): void {
  const userProjects = projects.filter(p => p.assignee?.id === userId);
  const user = users.find(u => u.id === userId);
  
  if (user) {
    const projectNames = userProjects.map(p => p.name).join('\n');
    alert(`Projects for ${user.name}:\n${projectNames || 'No projects assigned'}`);
  }
};

(window as any).editProject = function(projectId: string): void {
  const project = projects.find(p => p.id === projectId);
  if (project) {
    const newName = prompt('Enter new project name:', project.name);
    if (newName && newName !== project.name) {

      console.log('Update project name:', projectId, newName);
    }
  }
};

(window as any).deleteProject = async function(projectId: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this project?')) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete project');

    await fetchProjects();
    alert('Project deleted successfully');

  } catch (error) {
    console.error('Error deleting project:', error);
    alert('Failed to delete project');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  renderNavigation();
  fetchAdminProfile();
  fetchUsers();
  fetchProjects();
  setupProfileImageUpload();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const hash = window.location.hash.slice(1) || 'overview';
  const link = document.querySelector(`[data-section="${hash}"]`) as HTMLAnchorElement;
  if (link) {
    link.click();
  }

  const addProjectBtn = document.getElementById('addProjectBtn');
  const addProjectModal = document.getElementById('addProjectModal');
  const closeModal = addProjectModal?.querySelector('.close');

  if (addProjectBtn && addProjectModal) {
    addProjectBtn.addEventListener('click', () => {
      addProjectModal.style.display = 'block';
    });

    closeModal?.addEventListener('click', () => {
      addProjectModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === addProjectModal) {
        addProjectModal.style.display = 'none';
      }
    });
  }
});

function fetchAndRenderProjects() {
  throw new Error('Function not implemented.');
}
