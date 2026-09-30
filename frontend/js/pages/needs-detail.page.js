/**
 * NIVARAN — Government Need Detail / View Page (Module 2 + 4)
 */

import { governmentNeedService } from '../services/governmentNeed.service.js';
import { approvalService }       from '../services/approval.service.js';
import { authService }           from '../services/auth.service.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function field(label, value, empty = 'Not provided') {
  return `
    <div class="need-field">
      <div class="need-field-label">${esc(label)}</div>
      ${value ? `<div class="need-field-value">${esc(value)}</div>` : `<div class="need-field-empty">${esc(empty)}</div>`}
    </div>
  `;
}
function statusBadge(s) {
  const map = {
    DRAFT:      ['badge-draft',     'Draft'],
    SUBMITTED:  ['badge-submitted', 'Submitted'],
    SENT_BACK:  ['badge-sent-back', 'Sent Back'],
    APPROVED:   ['badge-approved',  'Approved'],
    REJECTED:   ['badge-rejected',  'Rejected'],
  };
  const [cls, label] = map[s] ?? ['badge-default', s];
  return `<span class="badge ${cls}">${label}</span>`;
}
function dotClass(a) {
  const m = { SUBMITTED:'dot-submitted', APPROVED:'dot-approved', REJECTED:'dot-rejected', SENT_BACK:'dot-sent-back', RESUBMITTED:'dot-resubmitted' };
  return m[a] ?? 'dot-submitted';
}
function actionLabel(a) {
  const m = { SUBMITTED:'Submitted', APPROVED:'Approved', REJECTED:'Rejected', SENT_BACK:'Sent Back', RESUBMITTED:'Resubmitted' };
  return m[a] ?? a;
}
function actionColor(a) {
  const m = { APPROVED:'#15803d', REJECTED:'#b91c1c', SENT_BACK:'#b45309', SUBMITTED:'#1d4ed8', RESUBMITTED:'#7c3aed' };
  return m[a] ?? '#374151';
}

export async function initPage(container, user, opts = {}) {
  const needId = opts.needId;
  if (!needId) {
    container.innerHTML = `<div class="forbidden-state"><h2>Not Found</h2><p>No government need ID specified.</p></div>`;
    return;
  }

  container.innerHTML = `<div class="flex-center" style="height:200px"><div class="spinner"></div></div>`;

  let need;
  try {
    const data = await governmentNeedService.getNeed(needId);
    need = data.need ?? data;
  } catch (err) {
    container.innerHTML = `<div class="forbidden-state"><h2>Error</h2><p>${esc(err.message)}</p></div>`;
    return;
  }

  const isDraft      = need.status === 'DRAFT';
  const isSentBack   = need.status === 'SENT_BACK';
  const isSubmitted  = need.status === 'SUBMITTED';
  const isApproved   = need.status === 'APPROVED';
  const isRejected   = need.status === 'REJECTED';
  const canEdit      = (isDraft || isSentBack) && authService.hasPermission('PROBLEM_EDIT');
  const canDelete    = isDraft && authService.hasPermission('PROBLEM_EDIT');
  const canSubmit    = isDraft && authService.hasPermission('PROBLEM_SUBMIT');
  const canResubmit  = isSentBack && authService.hasPermission('PROBLEM_SUBMIT');
  const kpis         = Array.isArray(need.initialKPIs) ? need.initialKPIs : [];
  const history      = need.reviewHistory ?? [];

  // Latest SENT_BACK reason for the notice
  const lastSentBack = [...history].reverse().find(h => h.action === 'SENT_BACK');

  container.innerHTML = `
    <link rel="stylesheet" href="css/pages/needs.css" />
    <link rel="stylesheet" href="css/pages/approvals.css" />

    <div class="need-detail">
      <div class="need-detail-header">
        <div>
          <button class="btn btn-outline btn-sm" id="back-btn" type="button" style="margin-bottom:var(--space-3)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Government Needs
          </button>
          <div class="need-detail-title">${esc(need.title)}</div>
          <div class="need-detail-meta">
            ${statusBadge(need.status)}
            <span>Created by <strong>${esc(need.createdBy?.name ?? '—')}</strong></span>
            <span>${esc(need.organization?.name ?? '—')}</span>
            <span>Created ${fmt(need.createdAt)}</span>
            ${need.submittedAt ? `<span>Submitted ${fmt(need.submittedAt)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:flex-start">
          ${canEdit      ? `<button class="btn btn-outline btn-sm" id="edit-btn" type="button">Edit</button>` : ''}
          ${canSubmit    ? `<button class="btn btn-primary btn-sm" id="submit-btn" type="button" style="background-color:#0f2554;border-color:#0f2554">Submit Problem</button>` : ''}
          ${canResubmit  ? `<button class="btn btn-primary btn-sm" id="resubmit-btn" type="button" style="background-color:#7c3aed;border-color:#7c3aed">Resubmit for Review</button>` : ''}
          ${canDelete    ? `<button class="btn btn-sm" id="delete-btn" type="button" style="border:1px solid #fecaca;color:var(--color-danger);background:none;border-radius:var(--radius-md);padding:4px 12px;cursor:pointer;font-size:var(--text-sm)">Delete Draft</button>` : ''}
        </div>
      </div>

      <div id="action-alert" class="alert alert-danger hidden" style="margin-bottom:var(--space-4)"></div>

      <!-- SENT BACK notice -->
      ${isSentBack && lastSentBack ? `
        <div class="sent-back-notice">
          <div class="sent-back-notice-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Sent Back for Revision — ${fmt(lastSentBack.createdAt)}
          </div>
          <div class="sent-back-notice-comment">Reviewer's comment: ${esc(lastSentBack.comment ?? 'No comment provided.')}</div>
        </div>
      ` : ''}

      <!-- APPROVED notice -->
      ${isApproved ? `
        <div class="readonly-notice">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="stroke:#15803d"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="color:#15803d">This Government Need has been <strong>approved</strong> and is read-only.</span>
        </div>
      ` : ''}

      <!-- REJECTED notice -->
      ${isRejected ? `
        <div class="readonly-notice" style="background-color:#fef2f2;border-color:#fecaca">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="stroke:#b91c1c"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span style="color:#b91c1c">This Government Need has been <strong>rejected</strong>.</span>
        </div>
      ` : ''}

      <!-- SUBMITTED notice -->
      ${isSubmitted ? `
        <div class="readonly-notice">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Submitted and awaiting review. Original information is preserved and cannot be edited.
        </div>
      ` : ''}

      <!-- Section 1 -->
      <div class="need-detail-section">
        <h3>Problem</h3>
        ${field('Title', need.title)}
        ${field('Problem Statement', need.problemStatement)}
        ${field('Current Situation', need.currentSituation)}
        ${field('Existing Process', need.existingProcess)}
      </div>

      <!-- Section 2 -->
      <div class="need-detail-section">
        <h3>Desired Outcome</h3>
        ${field('Desired Outcome', need.desiredOutcome)}
        ${field('Success Criteria', need.successCriteria)}
      </div>

      <!-- Section 3 -->
      <div class="need-detail-section">
        <h3>Context</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
          ${field('Domain', need.domain)}
          ${field('Sub-Domain', need.subDomain)}
          ${field('Geographic Scope', need.geographicScope)}
          ${field('Operational Scope', need.operationalScope)}
          ${field('Affected Population', need.affectedPopulation)}
          ${field('Population Estimate', need.affectedPopulationEstimate ? String(need.affectedPopulationEstimate) : null)}
          ${field('Expected Start', fmtDate(need.expectedStartDate))}
          ${field('Expected Target', fmtDate(need.expectedTargetDate))}
          ${field('Urgency', need.urgency ? (need.urgency.charAt(0)+need.urgency.slice(1).toLowerCase()) : null)}
        </div>
      </div>

      <!-- Section 4 -->
      <div class="need-detail-section">
        <h3>Constraints</h3>
        ${field('Constraints', need.constraints)}
      </div>

      <!-- Section 5 -->
      <div class="need-detail-section">
        <h3>Measurement Context</h3>
        ${field('Baseline Information', need.baselineInformation)}
        <div class="need-field">
          <div class="need-field-label">Initial KPIs</div>
          ${kpis.length ? `
            <table class="kpi-table" style="margin-top:var(--space-2)">
              <thead><tr><th>KPI</th><th>Baseline</th><th>Target</th><th>Unit</th></tr></thead>
              <tbody>${kpis.map(k=>`<tr><td>${esc(k.name)}</td><td>${esc(k.currentValue)||'—'}</td><td>${esc(k.targetValue)||'—'}</td><td>${esc(k.unit)||'—'}</td></tr>`).join('')}</tbody>
            </table>
          ` : `<div class="need-field-empty">No KPIs specified.</div>`}
        </div>
      </div>

      <!-- Section 6 -->
      <div class="need-detail-section">
        <h3>Additional Information</h3>
        ${field('Additional Context', need.additionalContext)}
      </div>

      <!-- Review History -->
      ${history.length ? `
        <div class="need-detail-section">
          <h3>Review History</h3>
          <div class="timeline" style="margin-top:var(--space-3)">
            ${history.map(h => `
              <div class="timeline-item">
                <div class="timeline-dot ${dotClass(h.action)}"></div>
                <div class="timeline-action" style="color:${actionColor(h.action)};font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${actionLabel(h.action)}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${esc(h.actor?.name ?? '—')} &middot; ${fmt(h.createdAt)}</div>
                ${h.comment ? `<div class="timeline-comment">${esc(h.comment)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Record -->
      <div class="need-detail-section">
        <h3>Record</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
          ${field('Organization', need.organization?.name)}
          ${field('Organizational Unit', need.organizationalUnit?.name)}
          ${field('Created By', need.createdBy?.name)}
          ${field('Created', fmt(need.createdAt))}
          ${field('Last Updated', fmt(need.updatedAt))}
          ${field('Submitted', need.submittedAt ? fmt(need.submittedAt) : null, 'Not yet submitted')}
        </div>
      </div>
    </div>
  `;

  // Button handlers
  document.getElementById('back-btn')?.addEventListener('click', () => { window.location.hash = 'needs'; });
  document.getElementById('edit-btn')?.addEventListener('click', () => { window.location.hash = `needs-edit-${need.id}`; });

  document.getElementById('submit-btn')?.addEventListener('click', async () => {
    if (!confirm('Submit this government need for review? It cannot be edited once submitted.')) return;
    const alertEl = document.getElementById('action-alert');
    try {
      await governmentNeedService.submitNeed(need.id);
      initPage(container, user, opts);
    } catch (err) {
      alertEl.textContent = err.message; alertEl.classList.remove('hidden');
    }
  });

  document.getElementById('resubmit-btn')?.addEventListener('click', async () => {
    if (!confirm('Resubmit this government need for review?')) return;
    const alertEl = document.getElementById('action-alert');
    try {
      await approvalService.resubmitNeed(need.id);
      initPage(container, user, opts);
    } catch (err) {
      alertEl.textContent = err.message; alertEl.classList.remove('hidden');
    }
  });

  document.getElementById('delete-btn')?.addEventListener('click', async () => {
    if (!confirm('Delete this draft permanently?')) return;
    const alertEl = document.getElementById('action-alert');
    try {
      await governmentNeedService.deleteNeed(need.id);
      window.location.hash = 'needs';
    } catch (err) {
      alertEl.textContent = err.message; alertEl.classList.remove('hidden');
    }
  });
}
