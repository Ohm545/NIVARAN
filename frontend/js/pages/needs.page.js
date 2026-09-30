/**
 * NIVARAN — Government Needs List Page (Module 2)
 */

import { governmentNeedService } from '../services/governmentNeed.service.js';
import { authService }           from '../services/auth.service.js';
import { ApiError }              from '../api.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function statusBadge(s) {
  if (s === 'DRAFT')      return `<span class="badge badge-draft">Draft</span>`;
  if (s === 'SUBMITTED')  return `<span class="badge badge-submitted">Submitted</span>`;
  return `<span class="badge badge-default">${esc(s)}</span>`;
}

let _page = 1;
let _status = '';
let _domain = '';
let _needs  = [];

export async function initPage(container, user) {
  const canCreate = authService.hasPermission('PROBLEM_CREATE');

  container.innerHTML = `
    <link rel="stylesheet" href="css/pages/admin.css" />
    <link rel="stylesheet" href="css/pages/needs.css" />

    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <h1>Government Needs</h1>
        <p>Identify and manage operational problems that may benefit from innovative solutions.</p>
      </div>
      ${canCreate ? `
        <button class="btn btn-primary" id="create-need-btn" type="button" style="background-color:#0f2554;border-color:#0f2554">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Government Need
        </button>
      ` : ''}
    </div>

    <div class="filter-bar">
      <div class="search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-input search-input" type="search" id="needs-search" placeholder="Search needs…" />
      </div>
      <select class="form-select filter-select" id="needs-status-filter">
        <option value="">All Statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="SUBMITTED">Submitted</option>
      </select>
    </div>

    <div id="needs-list-root"></div>
  `;

  if (canCreate) {
    document.getElementById('create-need-btn').addEventListener('click', () => {
      window.location.hash = 'needs-create';
    });
  }

  document.getElementById('needs-status-filter').addEventListener('change', e => {
    _status = e.target.value;
    _page = 1;
    loadNeeds();
  });

  // Client-side search on loaded data
  document.getElementById('needs-search').addEventListener('input', e => {
    renderTable(e.target.value.toLowerCase());
  });

  await loadNeeds();
}

async function loadNeeds() {
  const root = document.getElementById('needs-list-root');
  if (!root) return;
  root.innerHTML = `<div class="flex-center" style="height:120px"><div class="spinner"></div></div>`;

  try {
    const data = await governmentNeedService.listNeeds({ page: _page, limit: 50, status: _status || undefined });
    _needs = data ?? [];
    renderTable('');
  } catch (err) {
    root.innerHTML = `<div class="table-empty">Failed to load government needs: ${esc(err.message)}</div>`;
  }
}

function renderTable(filter) {
  const root = document.getElementById('needs-list-root');
  if (!root) return;

  const list = filter
    ? _needs.filter(n => n.title?.toLowerCase().includes(filter) || n.domain?.toLowerCase().includes(filter))
    : _needs;

  if (!list.length) {
    root.innerHTML = `
      <div style="text-align:center;padding:var(--space-16) var(--space-4);">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;stroke:#e2e8f0;margin:0 auto var(--space-4)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h2 style="font-size:var(--text-lg);font-weight:600;color:var(--color-text-muted);margin-bottom:var(--space-2)">No government needs yet</h2>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Create a government need to begin the innovation procurement process.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Domain</th>
            <th>Status</th>
            <th>Created By</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(n => `
            <tr>
              <td class="td-name" style="max-width:280px">${esc(n.title)}</td>
              <td>${esc(n.domain) || '—'}</td>
              <td>${statusBadge(n.status)}</td>
              <td class="td-muted">${esc(n.createdBy?.name ?? '—')}</td>
              <td class="td-muted">${fmt(n.createdAt)}</td>
              <td class="td-muted">${fmt(n.updatedAt)}</td>
              <td>
                <div class="td-actions">
                  <button class="action-btn" data-action="view" data-id="${esc(n.id)}" type="button">View</button>
                  ${n.status === 'DRAFT' ? `<button class="action-btn" data-action="edit" data-id="${esc(n.id)}" type="button">Edit</button>` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'view') window.location.hash = `needs-view-${id}`;
    if (action === 'edit') window.location.hash = `needs-edit-${id}`;
  });
}
