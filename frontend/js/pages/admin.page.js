/**
 * NIVARAN — Administration Page
 *
 * Tabs: Users | Organizations | Roles
 * All data fetched live from the REST API.
 * SYSTEM_ADMIN only (enforced by backend; frontend hides nav link too).
 */

import { userService }         from '../services/user.service.js';
import { organizationService } from '../services/organization.service.js';
import { ApiError }            from '../api.js';

// ── Helpers ───────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  return status === 'ACTIVE'
    ? `<span class="badge badge-success">Active</span>`
    : `<span class="badge badge-danger">Inactive</span>`;
}

function showToast(msg, type = 'success') {
  const existing = document.getElementById('admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'admin-toast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:6px;font-size:14px;font-weight:500;
    background-color:${type === 'success' ? '#16a34a' : '#dc2626'};
    color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);
    transition:opacity 0.3s;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── State ─────────────────────────────────────────────────────

let _roles = [];
let _orgs  = [];
let _activeTab = 'users';

// ── Entry point ───────────────────────────────────────────────

export async function initPage(container) {
  container.innerHTML = `
    <link rel="stylesheet" href="css/pages/admin.css" />

    <div class="page-header">
      <h1>Administration</h1>
      <p>Manage users, organizations, and roles.</p>
    </div>

    <div class="admin-tabs" id="admin-tabs" style="
      display:flex;gap:0;border-bottom:1px solid var(--color-border);
      margin-bottom:var(--space-6);
    ">
      ${['users','organizations','roles'].map(t => `
        <button
          class="admin-tab-btn"
          data-tab="${t}"
          style="
            padding:var(--space-3) var(--space-5);
            background:none;border:none;border-bottom:2px solid transparent;
            font-size:var(--text-sm);font-weight:500;cursor:pointer;
            color:var(--color-text-muted);transition:all 150ms;
          "
        >${t.charAt(0).toUpperCase()+t.slice(1)}</button>
      `).join('')}
    </div>

    <div id="admin-tab-content"></div>
    <div id="admin-modal-root"></div>
  `;

  // Pre-load reference data
  try {
    const [rolesData, orgsData] = await Promise.all([
      organizationService.listRoles(),
      organizationService.listOrganizations(),
    ]);
    _roles = rolesData.roles ?? [];
    _orgs  = orgsData.organizations ?? [];
  } catch { /* will show empty dropdowns */ }

  // Tab click
  document.getElementById('admin-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    setTab(btn.dataset.tab);
  });

  setTab('users');
}

function setTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.style.borderBottomColor = active ? '#0f2554' : 'transparent';
    btn.style.color = active ? '#0f2554' : 'var(--color-text-muted)';
    btn.style.fontWeight = active ? '600' : '500';
  });

  const content = document.getElementById('admin-tab-content');
  if (tab === 'users')         renderUsersTab(content);
  else if (tab === 'organizations') renderOrgsTab(content);
  else if (tab === 'roles')    renderRolesTab(content);
}

// ══════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════

let _usersPage = 1;
let _usersData = [];

async function renderUsersTab(container) {
  container.innerHTML = `
    <div class="admin-toolbar">
      <div class="admin-toolbar-left">
        <div class="search-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="form-input search-input" type="search" id="user-search" placeholder="Search users…" />
        </div>
      </div>
      <button class="btn btn-primary btn-sm" id="create-user-btn" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add User
      </button>
    </div>
    <div id="users-table-root"></div>
  `;

  document.getElementById('create-user-btn').addEventListener('click', () => openUserModal(null));
  document.getElementById('user-search').addEventListener('input', e => {
    renderUsersTable(document.getElementById('users-table-root'), e.target.value.trim().toLowerCase());
  });

  await loadUsers();
}

async function loadUsers() {
  const root = document.getElementById('users-table-root');
  if (!root) return;

  root.innerHTML = `<div class="flex-center" style="height:120px"><div class="spinner"></div></div>`;

  try {
    const data = await userService.listUsers({ page: _usersPage, limit: 50 });
    _usersData = data.users ?? data ?? [];
    renderUsersTable(root, '');
  } catch (err) {
    root.innerHTML = `<div class="table-empty">Failed to load users: ${esc(err.message)}</div>`;
  }
}

function renderUsersTable(root, filter) {
  const filtered = filter
    ? _usersData.filter(u =>
        u.name.toLowerCase().includes(filter) ||
        u.email.toLowerCase().includes(filter))
    : _usersData;

  if (!filtered.length) {
    root.innerHTML = `<div class="table-empty">${filter ? 'No users match your search.' : 'No users found.'}</div>`;
    return;
  }

  root.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Organization</th>
            <th>Unit</th>
            <th>Role(s)</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(u => {
            const roles = (u.userRoles ?? []).map(ur => esc(ur.role?.displayName ?? ur.role?.name ?? '')).join(', ') || '—';
            return `
              <tr>
                <td class="td-name">${esc(u.name)}</td>
                <td class="td-muted">${esc(u.email)}</td>
                <td>${esc(u.organization?.name ?? '—')}</td>
                <td>${esc(u.organizationalUnit?.name ?? '—')}</td>
                <td>${roles}</td>
                <td>${statusBadge(u.status)}</td>
                <td class="td-muted">${formatDate(u.createdAt)}</td>
                <td>
                  <div class="td-actions">
                    <button class="action-btn" data-action="edit" data-id="${esc(u.id)}" type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    ${u.status === 'ACTIVE'
                      ? `<button class="action-btn action-btn-danger" data-action="deactivate" data-id="${esc(u.id)}" type="button">Deactivate</button>`
                      : `<button class="action-btn action-btn-success" data-action="activate" data-id="${esc(u.id)}" type="button">Activate</button>`
                    }
                    <button class="action-btn" data-action="roles" data-id="${esc(u.id)}" type="button">Roles</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  root.addEventListener('click', handleUserTableAction);
}

async function handleUserTableAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'edit') {
    const user = _usersData.find(u => u.id === id);
    openUserModal(user);
  } else if (action === 'deactivate') {
    if (!confirm('Deactivate this user? They will not be able to log in.')) return;
    try {
      await userService.deactivateUser(id);
      showToast('User deactivated.');
      await loadUsers();
    } catch (err) { showToast(err.message, 'error'); }
  } else if (action === 'activate') {
    try {
      await userService.activateUser(id);
      showToast('User activated.');
      await loadUsers();
    } catch (err) { showToast(err.message, 'error'); }
  } else if (action === 'roles') {
    const user = _usersData.find(u => u.id === id);
    openRoleAssignModal(user);
  }
}

// ── User Create/Edit Modal ────────────────────────────────────

function openUserModal(user) {
  const isEdit = Boolean(user);
  const currentRoleIds = (user?.userRoles ?? []).map(ur => ur.role?.id ?? '');
  const currentOrgId   = user?.organization?.id   ?? '';
  const currentUnitId  = user?.organizationalUnit?.id ?? '';

  const orgOptions = _orgs.map(o =>
    `<option value="${esc(o.id)}" ${o.id === currentOrgId ? 'selected' : ''}>${esc(o.name)}</option>`
  ).join('');

  const units = currentOrgId
    ? (_orgs.find(o => o.id === currentOrgId)?.units ?? [])
    : [];

  const unitOptions = units.map(u =>
    `<option value="${esc(u.id)}" ${u.id === currentUnitId ? 'selected' : ''}>${esc(u.name)}</option>`
  ).join('');

  const roleOptions = _roles.map(r =>
    `<option value="${esc(r.id)}" ${currentRoleIds.includes(r.id) ? 'selected' : ''}>${esc(r.displayName)}</option>`
  ).join('');

  const html = `
    <div class="modal-overlay" id="user-modal">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? 'Edit User' : 'Add User'}</h2>
          <button class="modal-close" id="user-modal-close" type="button" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div id="user-modal-alert" class="alert alert-danger hidden"></div>
          <form id="user-modal-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="u-name">Full Name <span style="color:var(--color-danger)">*</span></label>
              <input class="form-input" type="text" id="u-name" value="${esc(user?.name ?? '')}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="u-email">Email Address <span style="color:var(--color-danger)">*</span></label>
              <input class="form-input" type="email" id="u-email" value="${esc(user?.email ?? '')}" required />
            </div>
            ${!isEdit ? `
            <div class="form-group">
              <label class="form-label" for="u-password">Password <span style="color:var(--color-danger)">*</span></label>
              <input class="form-input" type="password" id="u-password" placeholder="Min 8 chars, 1 uppercase, 1 number" required />
            </div>
            ` : ''}
            <div class="form-group">
              <label class="form-label" for="u-org">Organization</label>
              <select class="form-select" id="u-org">
                <option value="">— None —</option>
                ${orgOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="u-unit">Organizational Unit</label>
              <select class="form-select" id="u-unit">
                <option value="">— None —</option>
                ${unitOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="u-role">Functional Role</label>
              <select class="form-select" id="u-role">
                <option value="">— None —</option>
                ${roleOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="u-status">Status</label>
              <select class="form-select" id="u-status">
                <option value="ACTIVE"   ${(user?.status ?? 'ACTIVE') === 'ACTIVE'   ? 'selected' : ''}>Active</option>
                <option value="INACTIVE" ${user?.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" id="user-modal-cancel" type="button">Cancel</button>
          <button class="btn btn-primary btn-sm" id="user-modal-save" type="button">
            <span id="user-modal-save-text">${isEdit ? 'Save Changes' : 'Create User'}</span>
            <span id="user-modal-spinner" class="spinner spinner-sm hidden" style="width:14px;height:14px;border-width:2px;" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('admin-modal-root').innerHTML = html;

  // Update units when org changes
  document.getElementById('u-org').addEventListener('change', e => {
    const orgId = e.target.value;
    const org   = _orgs.find(o => o.id === orgId);
    const us    = org?.units ?? [];
    const unitSel = document.getElementById('u-unit');
    unitSel.innerHTML = '<option value="">— None —</option>' +
      us.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
  });

  document.getElementById('user-modal-close').addEventListener('click',  closeModal);
  document.getElementById('user-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('user-modal-save').addEventListener('click',   () => saveUser(user?.id));
}

async function saveUser(userId) {
  const alertEl  = document.getElementById('user-modal-alert');
  const saveBtn  = document.getElementById('user-modal-save');
  const saveText = document.getElementById('user-modal-save-text');
  const spinner  = document.getElementById('user-modal-spinner');

  const name     = document.getElementById('u-name').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const password = document.getElementById('u-password')?.value;
  const orgId    = document.getElementById('u-org').value  || null;
  const unitId   = document.getElementById('u-unit').value || null;
  const roleId   = document.getElementById('u-role').value || null;
  const status   = document.getElementById('u-status').value;

  // Client-side validation
  if (!name || !email) {
    alertEl.textContent = 'Name and email are required.';
    alertEl.classList.remove('hidden');
    return;
  }
  if (!userId && !password) {
    alertEl.textContent = 'Password is required for new users.';
    alertEl.classList.remove('hidden');
    return;
  }

  alertEl.classList.add('hidden');
  saveBtn.disabled = true;
  saveText.textContent = 'Saving…';
  spinner.classList.remove('hidden');

  try {
    if (userId) {
      // Update basic info
      await userService.updateUser(userId, { name, email, status, organizationId: orgId, organizationalUnitId: unitId });
      // Update role
      if (roleId !== null) {
        await userService.assignRoles(userId, roleId ? [roleId] : []);
      }
      showToast('User updated successfully.');
    } else {
      // Create user (role assigned after creation)
      const created = await userService.createUser({
        name, email, password, status,
        organizationId: orgId, organizationalUnitId: unitId,
        roleIds: roleId ? [roleId] : [],
      });
      showToast('User created successfully.');
    }
    closeModal();
    await loadUsers();
  } catch (err) {
    alertEl.textContent = err.message;
    alertEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveText.textContent = userId ? 'Save Changes' : 'Create User';
    spinner.classList.add('hidden');
  }
}

// ── Role Assignment Modal ─────────────────────────────────────

function openRoleAssignModal(user) {
  if (!user) return;
  const currentRoleIds = (user?.userRoles ?? []).map(ur => ur.role?.id ?? '');

  const html = `
    <div class="modal-overlay" id="role-modal">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Assign Roles — ${esc(user.name)}</h2>
          <button class="modal-close" id="role-modal-close" type="button" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div id="role-modal-alert" class="alert alert-danger hidden"></div>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4);">
            Select the functional role(s) for this user.
          </p>
          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            ${_roles.map(r => `
              <label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" value="${esc(r.id)}"
                  ${currentRoleIds.includes(r.id) ? 'checked' : ''}
                  style="width:16px;height:16px;accent-color:#0f2554;"
                />
                <span>
                  <strong>${esc(r.displayName)}</strong>
                  ${r.description ? `<span style="color:var(--color-text-muted);margin-left:4px">— ${esc(r.description)}</span>` : ''}
                </span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" id="role-modal-cancel" type="button">Cancel</button>
          <button class="btn btn-primary btn-sm" id="role-modal-save" type="button">Save Roles</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('admin-modal-root').innerHTML = html;
  document.getElementById('role-modal-close').addEventListener('click',  closeModal);
  document.getElementById('role-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('role-modal-save').addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('#role-modal .modal-body input[type=checkbox]:checked')]
      .map(cb => cb.value);
    try {
      await userService.assignRoles(user.id, checked);
      showToast('Roles updated.');
      closeModal();
      await loadUsers();
    } catch (err) {
      document.getElementById('role-modal-alert').textContent = err.message;
      document.getElementById('role-modal-alert').classList.remove('hidden');
    }
  });
}

function closeModal() {
  document.getElementById('admin-modal-root').innerHTML = '';
}

// ══════════════════════════════════════════════════════════════
// ORGANIZATIONS TAB
// ══════════════════════════════════════════════════════════════

async function renderOrgsTab(container) {
  container.innerHTML = `
    <div class="admin-toolbar">
      <div class="admin-toolbar-left"></div>
      <button class="btn btn-primary btn-sm" id="create-org-btn" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Organization
      </button>
    </div>
    <div id="orgs-list-root"></div>
    <div id="org-modal-root"></div>
  `;

  document.getElementById('create-org-btn').addEventListener('click', () => openOrgModal(null));
  await loadOrgs();
}

async function loadOrgs() {
  const root = document.getElementById('orgs-list-root');
  if (!root) return;
  root.innerHTML = `<div class="flex-center" style="height:100px"><div class="spinner"></div></div>`;

  try {
    const data = await organizationService.listOrganizations();
    _orgs = data.organizations ?? [];
    renderOrgsList(root);
  } catch (err) {
    root.innerHTML = `<div class="table-empty">Failed to load organizations: ${esc(err.message)}</div>`;
  }
}

function renderOrgsList(root) {
  if (!_orgs.length) {
    root.innerHTML = '<div class="table-empty">No organizations found.</div>';
    return;
  }

  root.innerHTML = _orgs.map(org => `
    <div class="card" style="margin-bottom:var(--space-4);">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);padding-bottom:var(--space-3);">
        <div>
          <span class="card-title">${esc(org.name)}</span>
          <span class="badge badge-default" style="margin-left:var(--space-2)">${esc(org.code)}</span>
          ${!org.isActive ? '<span class="badge badge-danger" style="margin-left:4px">Inactive</span>' : ''}
        </div>
        <button class="action-btn" data-org-edit="${esc(org.id)}" type="button">Edit</button>
      </div>
      ${org.description ? `<p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">${esc(org.description)}</p>` : ''}
      <div style="margin-top:var(--space-2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
          <span style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted)">
            Organizational Units (${(org.units ?? []).length})
          </span>
          <button class="action-btn" data-add-unit="${esc(org.id)}" type="button">+ Add Unit</button>
        </div>
        ${(org.units ?? []).length
          ? `<div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
              ${org.units.map(u => `
                <span style="padding:4px 10px;border:1px solid var(--color-border);border-radius:4px;font-size:var(--text-xs)">
                  ${esc(u.name)} <span style="color:var(--color-text-muted)">(${esc(u.code)})</span>
                </span>
              `).join('')}
             </div>`
          : `<p style="font-size:var(--text-sm);color:var(--color-text-muted)">No units yet.</p>`
        }
      </div>
    </div>
  `).join('');

  root.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-org-edit]');
    if (editBtn) {
      const org = _orgs.find(o => o.id === editBtn.dataset.orgEdit);
      openOrgModal(org);
    }
    const addUnitBtn = e.target.closest('[data-add-unit]');
    if (addUnitBtn) {
      openUnitModal(addUnitBtn.dataset.addUnit);
    }
  });
}

function openOrgModal(org) {
  const isEdit = Boolean(org);
  const root = document.getElementById('org-modal-root');

  root.innerHTML = `
    <div class="modal-overlay" id="org-modal">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? 'Edit Organization' : 'Add Organization'}</h2>
          <button class="modal-close" id="org-modal-close" type="button" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div id="org-modal-alert" class="alert alert-danger hidden"></div>
          <form id="org-modal-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="o-name">Organization Name <span style="color:var(--color-danger)">*</span></label>
              <input class="form-input" type="text" id="o-name" value="${esc(org?.name ?? '')}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="o-code">Code <span style="color:var(--color-danger)">*</span></label>
              <input class="form-input" type="text" id="o-code" value="${esc(org?.code ?? '')}" placeholder="e.g. DEPT_IT" ${isEdit ? 'disabled' : ''} required />
            </div>
            <div class="form-group">
              <label class="form-label" for="o-desc">Description</label>
              <textarea class="form-textarea" id="o-desc" rows="2">${esc(org?.description ?? '')}</textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" id="org-modal-cancel" type="button">Cancel</button>
          <button class="btn btn-primary btn-sm" id="org-modal-save" type="button">${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  `;

  const closeOrgModal = () => { root.innerHTML = ''; };
  document.getElementById('org-modal-close').addEventListener('click',  closeOrgModal);
  document.getElementById('org-modal-cancel').addEventListener('click', closeOrgModal);
  document.getElementById('org-modal-save').addEventListener('click', async () => {
    const alertEl = document.getElementById('org-modal-alert');
    const name = document.getElementById('o-name').value.trim();
    const code = document.getElementById('o-code').value.trim();
    const desc = document.getElementById('o-desc').value.trim();

    if (!name || (!isEdit && !code)) {
      alertEl.textContent = 'Name and code are required.';
      alertEl.classList.remove('hidden');
      return;
    }
    alertEl.classList.add('hidden');

    try {
      if (isEdit) {
        await organizationService.updateOrganization(org.id, { name, description: desc });
      } else {
        await organizationService.createOrganization({ name, code, description: desc });
      }
      showToast(isEdit ? 'Organization updated.' : 'Organization created.');
      closeOrgModal();
      await loadOrgs();
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.classList.remove('hidden');
    }
  });
}

function openUnitModal(orgId) {
  const org  = _orgs.find(o => o.id === orgId);
  const root = document.getElementById('org-modal-root');

  root.innerHTML = `
    <div class="modal-overlay" id="unit-modal">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Add Unit — ${esc(org?.name ?? '')}</h2>
          <button class="modal-close" id="unit-modal-close" type="button" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div id="unit-modal-alert" class="alert alert-danger hidden"></div>
          <div class="form-group">
            <label class="form-label" for="unit-name">Unit Name <span style="color:var(--color-danger)">*</span></label>
            <input class="form-input" type="text" id="unit-name" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="unit-code">Unit Code <span style="color:var(--color-danger)">*</span></label>
            <input class="form-input" type="text" id="unit-code" placeholder="e.g. FINANCE_DIV" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="unit-desc">Description</label>
            <textarea class="form-textarea" id="unit-desc" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" id="unit-modal-cancel" type="button">Cancel</button>
          <button class="btn btn-primary btn-sm" id="unit-modal-save" type="button">Add Unit</button>
        </div>
      </div>
    </div>
  `;

  const closeUnitModal = () => { root.innerHTML = ''; };
  document.getElementById('unit-modal-close').addEventListener('click',  closeUnitModal);
  document.getElementById('unit-modal-cancel').addEventListener('click', closeUnitModal);
  document.getElementById('unit-modal-save').addEventListener('click', async () => {
    const alertEl = document.getElementById('unit-modal-alert');
    const name = document.getElementById('unit-name').value.trim();
    const code = document.getElementById('unit-code').value.trim();
    const desc = document.getElementById('unit-desc').value.trim();

    if (!name || !code) {
      alertEl.textContent = 'Name and code are required.';
      alertEl.classList.remove('hidden');
      return;
    }
    alertEl.classList.add('hidden');

    try {
      await organizationService.createUnit(orgId, { name, code, description: desc });
      showToast('Unit added.');
      closeUnitModal();
      await loadOrgs();
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.classList.remove('hidden');
    }
  });
}

// ══════════════════════════════════════════════════════════════
// ROLES TAB
// ══════════════════════════════════════════════════════════════

async function renderRolesTab(container) {
  container.innerHTML = `<div id="roles-table-root"></div>`;
  const root = document.getElementById('roles-table-root');
  root.innerHTML = `<div class="flex-center" style="height:100px"><div class="spinner"></div></div>`;

  try {
    const data = await organizationService.listRoles();
    _roles = data.roles ?? [];

    if (!_roles.length) {
      root.innerHTML = '<div class="table-empty">No roles found.</div>';
      return;
    }

    root.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Internal Name</th>
              <th>Description</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            ${_roles.map(r => `
              <tr>
                <td class="td-name">${esc(r.displayName)}</td>
                <td><code style="font-family:var(--font-mono);font-size:var(--text-xs);background:#f1f5f9;padding:2px 6px;border-radius:4px">${esc(r.name)}</code></td>
                <td class="td-muted">${esc(r.description ?? '—')}</td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:360px">
                    ${(r.rolePermissions ?? [])
                      .filter(rp => rp.permission?.isActive)
                      .map(rp => `<span class="badge badge-info" style="font-size:10px">${esc(rp.permission?.name)}</span>`)
                      .join('') || '<span style="color:var(--color-text-muted);font-size:var(--text-xs)">None active</span>'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    root.innerHTML = `<div class="table-empty">Failed to load roles: ${esc(err.message)}</div>`;
  }
}
