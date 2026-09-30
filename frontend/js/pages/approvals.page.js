/**
 * NIVARAN — Approvals Dashboard Page (Module 4)
 * Role: APPROVING_AUTHORITY
 */

import { approvalService } from '../services/approval.service.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function statusBadge(s) {
  const map = {
    SUBMITTED:  ['badge-submitted', 'Submitted'],
    APPROVED:   ['badge-approved',  'Approved'],
    REJECTED:   ['badge-rejected',  'Rejected'],
    SENT_BACK:  ['badge-sent-back', 'Sent Back'],
    DRAFT:      ['badge-draft',     'Draft'],
  };
  const [cls, label] = map[s] ?? ['badge-default', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function urgencyBadge(u) {
  if (!u) return '—';
  const map = { LOW:'badge-default', MEDIUM:'badge-info', HIGH:'badge-warning', CRITICAL:'badge-danger' };
  return `<span class="badge ${map[u] ?? 'badge-default'}">${u.charAt(0)+u.slice(1).toLowerCase()}</span>`;
}

let _activeTab = 'pending';

export async function initPage(container) {
  container.innerHTML = `
    <link rel="stylesheet" href="css/pages/admin.css" />
    <link rel="stylesheet" href="css/pages/approvals.css" />

    <div class="page-header">
      <h1>Approvals</h1>
      <p>Review and action Government Needs within your organizational scope.</p>
    </div>

    <div class="approval-tabs" id="approval-tabs">
      <button class="approval-tab active" data-tab="pending" type="button">
        Pending Review <span class="tab-count" id="count-pending">…</span>
      </button>
      <button class="approval-tab" data-tab="approved" type="button">Recently Approved</button>
      <button class="approval-tab" data-tab="rejected" type="button">Recently Rejected</button>
      <button class="approval-tab" data-tab="sent-back" type="button">Sent Back</button>
    </div>

    <div id="approval-content"></div>
  `;

  document.getElementById('approval-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    document.querySelectorAll('.approval-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _activeTab = btn.dataset.tab;
    loadTab(_activeTab);
  });

  await loadTab('pending');
}

async function loadTab(tab) {
  const content = document.getElementById('approval-content');
  content.innerHTML = `<div class="flex-center" style="height:120px"><div class="spinner"></div></div>`;

  const statusMap = {
    pending:   'SUBMITTED',
    approved:  'APPROVED',
    rejected:  'REJECTED',
    'sent-back': 'SENT_BACK',
  };

  try {
    const data = await approvalService.listApprovals({ status: statusMap[tab], limit: 50 });
    const needs = data ?? [];

    // Update pending count badge
    if (tab === 'pending') {
      const countEl = document.getElementById('count-pending');
      if (countEl) countEl.textContent = needs.length;
    }

    if (!needs.length) {
      const labels = { pending:'No Government Needs are currently awaiting approval.', approved:'No recently approved items.', rejected:'No recently rejected items.', 'sent-back':'No items sent back.' };
      content.innerHTML = `
        <div style="text-align:center;padding:var(--space-12) var(--space-4);">
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${labels[tab]}</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Domain</th>
              <th>Organization</th>
              <th>Problem Owner</th>
              <th>Submitted</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${needs.map(n => `
              <tr>
                <td class="td-name" style="max-width:240px">${esc(n.title)}</td>
                <td>${esc(n.domain)}</td>
                <td>${esc(n.organization?.name ?? '—')}</td>
                <td class="td-muted">${esc(n.createdBy?.name ?? '—')}</td>
                <td class="td-muted">${fmt(n.submittedAt)}</td>
                <td>${urgencyBadge(n.urgency)}</td>
                <td>${statusBadge(n.status)}</td>
                <td>
                  <div class="td-actions">
                    <button class="action-btn" data-action="review" data-id="${esc(n.id)}" type="button">
                      ${tab === 'pending' ? 'Review' : 'View'}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    content.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      window.location.hash = `approvals-review-${btn.dataset.id}`;
    });
  } catch (err) {
    content.innerHTML = `<div class="table-empty">Failed to load: ${esc(err.message)}</div>`;
  }
}
