/**
 * NIVARAN — Government Need Review Page (Module 4)
 * Role: APPROVING_AUTHORITY
 *
 * Shows the full need content, AI structure (if available),
 * review history, and action buttons: Approve / Send Back / Reject.
 */

import { governmentNeedService } from '../services/governmentNeed.service.js';
import { approvalService }       from '../services/approval.service.js';
import { ApiError }              from '../api.js';

// ── Helpers ───────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function statusBadge(s) {
  const map = { SUBMITTED:['badge-submitted','Submitted'], APPROVED:['badge-approved','Approved'], REJECTED:['badge-rejected','Rejected'], SENT_BACK:['badge-sent-back','Sent Back'], DRAFT:['badge-draft','Draft'] };
  const [cls, label] = map[s] ?? ['badge-default', s];
  return `<span class="badge ${cls}">${label}</span>`;
}
function field(label, value) {
  return `
    <div class="need-field">
      <div class="need-field-label">${esc(label)}</div>
      ${value ? `<div class="need-field-value">${esc(value)}</div>` : `<div class="need-field-empty">Not provided</div>`}
    </div>
  `;
}
function dotClass(action) {
  const m = { SUBMITTED:'dot-submitted', APPROVED:'dot-approved', REJECTED:'dot-rejected', SENT_BACK:'dot-sent-back', RESUBMITTED:'dot-resubmitted' };
  return m[action] ?? 'dot-submitted';
}
function actionLabel(a) {
  const m = { SUBMITTED:'Submitted', APPROVED:'Approved', REJECTED:'Rejected', SENT_BACK:'Sent Back', RESUBMITTED:'Resubmitted' };
  return m[a] ?? a;
}

// ── Entry ─────────────────────────────────────────────────────
export async function initPage(container, user, opts = {}) {
  const { needId } = opts;
  if (!needId) { container.innerHTML = `<div class="forbidden-state"><h2>Not Found</h2></div>`; return; }

  container.innerHTML = `<div class="flex-center" style="height:200px"><div class="spinner"></div></div>`;

  let need;
  try {
    const data = await governmentNeedService.getNeed(needId);
    need = data.need ?? data;
  } catch (err) {
    container.innerHTML = `<div class="forbidden-state"><h2>Error</h2><p>${esc(err.message)}</p></div>`;
    return;
  }

  const isPending  = need.status === 'SUBMITTED';
  const kpis       = Array.isArray(need.initialKPIs) ? need.initialKPIs : [];
  const history    = need.reviewHistory ?? [];

  container.innerHTML = `
    <link rel="stylesheet" href="css/pages/needs.css" />
    <link rel="stylesheet" href="css/pages/approvals.css" />

    <div style="margin-bottom:var(--space-4)">
      <button class="btn btn-outline btn-sm" id="back-btn" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to Approvals
      </button>
    </div>

    <div id="action-alert" class="alert alert-danger hidden" style="max-width:900px;margin-bottom:var(--space-4)"></div>

    <div class="review-layout">

      <!-- LEFT: Need content -->
      <div>
        <div style="margin-bottom:var(--space-5)">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);flex-wrap:wrap">
            ${statusBadge(need.status)}
            ${need.urgency ? `<span class="badge badge-warning">${esc(need.urgency.charAt(0)+need.urgency.slice(1).toLowerCase())} Urgency</span>` : ''}
          </div>
          <h1 style="font-size:var(--text-2xl);font-weight:700;color:#0f2554;margin-bottom:var(--space-2)">${esc(need.title)}</h1>
          <div style="display:flex;gap:var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted);flex-wrap:wrap">
            <span>By <strong>${esc(need.createdBy?.name ?? '—')}</strong></span>
            <span>${esc(need.organization?.name ?? '—')}</span>
            <span>Submitted ${fmt(need.submittedAt)}</span>
          </div>
        </div>

        <!-- Problem -->
        <div class="need-detail-section">
          <h3>Problem</h3>
          ${field('Problem Statement', need.problemStatement)}
          ${field('Current Situation', need.currentSituation)}
          ${field('Existing Process', need.existingProcess)}
        </div>

        <!-- Desired Outcome -->
        <div class="need-detail-section">
          <h3>Desired Outcome</h3>
          ${field('Desired Outcome', need.desiredOutcome)}
          ${field('Success Criteria', need.successCriteria)}
        </div>

        <!-- Context -->
        <div class="need-detail-section">
          <h3>Context</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            ${field('Domain', need.domain)}
            ${field('Sub-Domain', need.subDomain)}
            ${field('Geographic Scope', need.geographicScope)}
            ${field('Operational Scope', need.operationalScope)}
            ${field('Affected Population', need.affectedPopulation)}
            ${field('Expected Start', fmtDate(need.expectedStartDate))}
            ${field('Expected Target', fmtDate(need.expectedTargetDate))}
          </div>
        </div>

        <!-- Constraints -->
        <div class="need-detail-section">
          <h3>Constraints</h3>
          ${field('Constraints', need.constraints)}
        </div>

        <!-- Baseline & KPIs -->
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

        <!-- Additional -->
        <div class="need-detail-section">
          <h3>Additional Information</h3>
          ${field('Additional Context', need.additionalContext)}
        </div>

        <!-- AI Structure (Module 3 placeholder) -->
        <div class="ai-section">
          <div class="ai-section-label">AI-Assisted Structure</div>
          <p class="ai-disclaimer">AI analysis is informational only. It does not represent an official decision.</p>
          ${need.aiAnalysis
            ? `<div style="font-size:var(--text-sm);color:var(--color-text)">AI structure available — Module 3 output.</div>`
            : `<div style="font-size:var(--text-sm);color:var(--color-text-muted);font-style:italic">No AI-assisted structure has been generated for this Government Need.</div>`
          }
        </div>
      </div>

      <!-- RIGHT: Actions + History -->
      <div class="review-sidebar">

        <!-- Action card — only shown for SUBMITTED -->
        ${isPending ? `
          <div class="review-action-card" style="margin-bottom:var(--space-4)">
            <div class="review-action-header">Review Decision</div>
            <div class="review-action-body">
              <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">
                Your decision applies to this Government Need only. You cannot modify the Problem Owner's content.
              </p>
              <div class="review-action-buttons">
                <button class="btn btn-approve" id="btn-approve" type="button" style="width:100%;justify-content:center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
                  Approve
                </button>
                <button class="btn btn-send-back" id="btn-send-back" type="button" style="width:100%;justify-content:center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;flex-shrink:0"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                  Send Back
                </button>
                <button class="btn btn-reject" id="btn-reject" type="button" style="width:100%;justify-content:center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;flex-shrink:0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ` : `
          <div class="review-action-card" style="margin-bottom:var(--space-4)">
            <div class="review-action-header">Status</div>
            <div class="review-action-body">
              ${statusBadge(need.status)}
              <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-3)">
                This Government Need has already been actioned.
              </p>
            </div>
          </div>
        `}

        <!-- Review History -->
        <div class="review-action-card">
          <div class="review-action-header">Review History</div>
          <div class="review-action-body">
            ${history.length ? `
              <div class="timeline">
                ${history.map(h => `
                  <div class="timeline-item">
                    <div class="timeline-dot ${dotClass(h.action)}"></div>
                    <div class="timeline-action" style="color:${actionColor(h.action)}">${actionLabel(h.action)}</div>
                    <div class="timeline-actor">${esc(h.actor?.name ?? '—')} &middot; ${fmt(h.createdAt)}</div>
                    ${h.comment ? `<div class="timeline-comment">${esc(h.comment)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : `<p style="font-size:var(--text-sm);color:var(--color-text-muted)">No review actions yet.</p>`}
          </div>
        </div>

      </div>
    </div>

    <!-- Decision Modals -->
    <div id="modal-root"></div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => { window.location.hash = 'approvals'; });

  if (isPending) {
    document.getElementById('btn-approve')?.addEventListener('click',    () => openModal('approve',    need));
    document.getElementById('btn-send-back')?.addEventListener('click',  () => openModal('send-back',  need));
    document.getElementById('btn-reject')?.addEventListener('click',     () => openModal('reject',     need));
  }
}

function actionColor(a) {
  const m = { APPROVED:'#15803d', REJECTED:'#b91c1c', SENT_BACK:'#b45309', SUBMITTED:'#1d4ed8', RESUBMITTED:'#7c3aed' };
  return m[a] ?? '#374151';
}

// ── Decision Modals ───────────────────────────────────────────

function openModal(type, need) {
  const root = document.getElementById('modal-root');

  const titles = { approve:'Approve Government Need', 'send-back':'Send Back for Revision', reject:'Reject Government Need' };
  const btnLabel = { approve:'Confirm Approval', 'send-back':'Send Back', reject:'Confirm Rejection' };
  const btnClass = { approve:'btn-approve', 'send-back':'btn-send-back', reject:'btn-reject' };
  const needsReason = type === 'send-back' || type === 'reject';
  const placeholder = {
    'send-back': 'e.g. Please provide baseline information for the current process and clarify the target population.',
    reject:      'State the reason this Government Need cannot be approved.',
    approve:     'Optional: Add a comment for the record.',
  };

  root.innerHTML = `
    <div class="decision-modal-overlay" id="decision-overlay">
      <div class="decision-modal">
        <div class="decision-modal-header">${titles[type]}</div>
        <div class="decision-modal-body">
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">
            ${type === 'approve'
              ? 'Approving this Government Need will move it to the next workflow stage. This action will be recorded.'
              : type === 'send-back'
              ? 'The Problem Owner will be asked to revise and resubmit. Provide a clear reason.'
              : 'Rejection is permanent in this workflow cycle. The Problem Owner cannot resubmit after rejection.'}
          </p>
          <div id="modal-alert" class="alert alert-danger hidden" style="margin-bottom:var(--space-3)"></div>
          <div class="form-group">
            <label class="form-label" for="modal-reason">
              ${needsReason ? `Reason <span style="color:var(--color-danger)">*</span>` : 'Comment (optional)'}
            </label>
            <textarea class="form-textarea" id="modal-reason" rows="4"
              placeholder="${placeholder[type]}"
              style="min-height:100px"></textarea>
          </div>
        </div>
        <div class="decision-modal-footer">
          <button class="btn btn-outline btn-sm" id="modal-cancel" type="button">Cancel</button>
          <button class="btn ${btnClass[type]} btn-sm" id="modal-confirm" type="button">
            <span id="modal-confirm-text">${btnLabel[type]}</span>
            <span id="modal-spinner" class="spinner hidden" style="width:14px;height:14px;border-width:2px;border-color:rgba(255,255,255,.3);border-top-color:#fff" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-cancel').addEventListener('click', () => { root.innerHTML = ''; });
  document.getElementById('decision-overlay').addEventListener('click', e => {
    if (e.target.id === 'decision-overlay') root.innerHTML = '';
  });

  document.getElementById('modal-confirm').addEventListener('click', async () => {
    const alertEl    = document.getElementById('modal-alert');
    const confirmBtn = document.getElementById('modal-confirm');
    const confirmTxt = document.getElementById('modal-confirm-text');
    const spinner    = document.getElementById('modal-spinner');
    const reason     = document.getElementById('modal-reason').value.trim();

    alertEl.classList.add('hidden');

    if (needsReason && !reason) {
      alertEl.textContent = 'A reason is required.';
      alertEl.classList.remove('hidden');
      return;
    }
    if (needsReason && reason.length < 10) {
      alertEl.textContent = 'Please provide a more detailed reason (at least 10 characters).';
      alertEl.classList.remove('hidden');
      return;
    }

    confirmBtn.disabled = true;
    confirmTxt.textContent = 'Processing…';
    spinner.classList.remove('hidden');

    try {
      if (type === 'approve')    await approvalService.approveNeed(need.id, reason);
      if (type === 'send-back')  await approvalService.sendBackNeed(need.id, reason);
      if (type === 'reject')     await approvalService.rejectNeed(need.id, reason);

      root.innerHTML = '';
      // Reload the page to show updated state
      window.location.hash = `approvals-review-${need.id}`;
      // Force reload since hash might be same
      const container = document.getElementById('page-content');
      if (container) {
        const mod = await import('./approvals-review.page.js');
        await mod.initPage(container, null, { needId: need.id });
      }
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.classList.remove('hidden');
      confirmBtn.disabled = false;
      confirmTxt.textContent = btnLabel[type];
      spinner.classList.add('hidden');
    }
  });
}
