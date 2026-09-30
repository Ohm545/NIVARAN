/**
 * NIVARAN — Government Need Create / Edit Form (Module 2)
 *
 * Used for both creating a new need and editing a DRAFT.
 * Call initPage(container, user, { mode: 'create' | 'edit', needId })
 */

import { governmentNeedService } from '../services/governmentNeed.service.js';
import { ApiError }              from '../api.js';

// ── Helpers ────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id)  { return document.getElementById(id)?.value ?? ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ''; }

const DOMAINS = [
  'Public Health','Education','Agriculture','Urban Governance','Rural Development',
  'Transport','Water & Sanitation','Environment','Public Safety','Citizen Services',
  'Finance','Energy','Infrastructure','Other',
];
const URGENCY_OPTIONS = ['LOW','MEDIUM','HIGH','CRITICAL'];

// ── KPI state ──────────────────────────────────────────────────
let _kpis = [];

function renderKPIBuilder() {
  const wrap = document.getElementById('kpi-builder-wrap');
  if (!wrap) return;

  if (!_kpis.length) {
    wrap.innerHTML = `
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">No KPIs added yet.</p>
      <button class="btn btn-outline btn-sm" id="add-kpi-btn" type="button">+ Add KPI</button>
    `;
  } else {
    wrap.innerHTML = `
      <div class="kpi-builder">
        <div class="kpi-builder-row kpi-builder-header">
          <div class="kpi-builder-cell">KPI Name</div>
          <div class="kpi-builder-cell">Baseline Value</div>
          <div class="kpi-builder-cell">Target Value</div>
          <div class="kpi-builder-cell">Unit</div>
          <div class="kpi-builder-cell" style="width:40px"></div>
        </div>
        ${_kpis.map((k, i) => `
          <div class="kpi-builder-row">
            <div class="kpi-builder-cell"><input type="text" data-kpi="${i}" data-field="name" value="${esc(k.name)}" placeholder="e.g. Average resolution time" /></div>
            <div class="kpi-builder-cell"><input type="text" data-kpi="${i}" data-field="currentValue" value="${esc(k.currentValue)}" placeholder="e.g. 15" /></div>
            <div class="kpi-builder-cell"><input type="text" data-kpi="${i}" data-field="targetValue" value="${esc(k.targetValue)}" placeholder="e.g. 5" /></div>
            <div class="kpi-builder-cell"><input type="text" data-kpi="${i}" data-field="unit" value="${esc(k.unit)}" placeholder="e.g. days" /></div>
            <div class="kpi-builder-cell">
              <button class="kpi-remove-btn" data-remove="${i}" type="button" title="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-outline btn-sm" id="add-kpi-btn" type="button" style="margin-top:var(--space-2)">+ Add KPI</button>
    `;
  }

  // KPI field input
  wrap.querySelectorAll('[data-kpi]').forEach(input => {
    input.addEventListener('input', e => {
      const i = parseInt(e.target.dataset.kpi);
      const f = e.target.dataset.field;
      _kpis[i][f] = e.target.value;
    });
  });

  // Remove KPI
  wrap.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      _kpis.splice(parseInt(btn.dataset.remove), 1);
      renderKPIBuilder();
    });
  });

  document.getElementById('add-kpi-btn')?.addEventListener('click', () => {
    _kpis.push({ name: '', currentValue: '', targetValue: '', unit: '' });
    renderKPIBuilder();
  });
}

// ── Entry ──────────────────────────────────────────────────────
export async function initPage(container, user, opts = {}) {
  const isEdit  = opts.mode === 'edit';
  const needId  = opts.needId || null;
  let existing  = null;
  _kpis = [];

  // Load existing for edit
  if (isEdit && needId) {
    container.innerHTML = `<div class="flex-center" style="height:200px"><div class="spinner"></div></div>`;
    try {
      const data = await governmentNeedService.getNeed(needId);
      existing = data.need ?? data;
      if (existing.status !== 'DRAFT' && existing.status !== 'SENT_BACK') {
        container.innerHTML = `<div class="forbidden-state"><h2>Not Editable</h2><p>This government need cannot be edited in its current status (${existing.status}).</p></div>`;
        return;
      }
      _kpis = Array.isArray(existing.initialKPIs) ? existing.initialKPIs.map(k => ({ ...k })) : [];
    } catch (err) {
      container.innerHTML = `<div class="forbidden-state"><h2>Error</h2><p>${esc(err.message)}</p></div>`;
      return;
    }
  }

  container.innerHTML = `
    <link rel="stylesheet" href="css/pages/needs.css" />

    <div class="page-header" style="display:flex;align-items:center;gap:var(--space-4)">
      <button class="btn btn-outline btn-sm" id="back-btn" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </button>
      <div>
        <h1>${isEdit ? 'Edit Government Need' : 'Create Government Need'}</h1>
        <p>${isEdit ? 'Update draft information.' : 'Enter your government problem details.'}</p>
      </div>
    </div>

    <div id="form-alert" class="alert alert-danger hidden" style="max-width:800px;margin-bottom:var(--space-4)"></div>
    <div id="form-success" class="alert alert-success hidden" style="max-width:800px;margin-bottom:var(--space-4)"></div>

    <form id="need-form" class="need-form" novalidate>

      <!-- SECTION 1: Problem -->
      <div class="form-section">
        <div class="form-section-header">
          <div class="form-section-title">Problem</div>
          <div class="form-section-desc">Describe the operational problem the government needs to solve.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-title">Problem Title <span class="req">*</span></label>
          <input class="form-input" type="text" id="f-title" maxlength="300"
            placeholder="e.g. Reduce Delays in Municipal Water Complaint Resolution"
            value="${esc(existing?.title ?? '')}" required />
          <p class="form-help">A concise, descriptive title. Max 300 characters.</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-problem">Problem Statement <span class="req">*</span></label>
          <textarea class="form-textarea" id="f-problem" rows="6"
            placeholder="Describe the operational problem, what is happening today, and why it matters."
            style="min-height:140px">${esc(existing?.problemStatement ?? '')}</textarea>
          <p class="form-help">Capture the problem in your own words. Do not suggest a technology solution here.</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-current">Current Situation</label>
          <textarea class="form-textarea" id="f-current" rows="4"
            placeholder="What is happening today? Current processes, known bottlenecks, existing limitations.">${esc(existing?.currentSituation ?? '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-process">Existing Process</label>
          <textarea class="form-textarea" id="f-process" rows="4"
            placeholder="How is this problem currently handled? Manual steps, software, responsible team.">${esc(existing?.existingProcess ?? '')}</textarea>
        </div>
      </div>

      <!-- SECTION 2: Desired Outcome -->
      <div class="form-section">
        <div class="form-section-header">
          <div class="form-section-title">Desired Outcome</div>
          <div class="form-section-desc">Describe the results you want to achieve, not the technology to use.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-outcome">Desired Outcome <span class="req">*</span></label>
          <textarea class="form-textarea" id="f-outcome" rows="5"
            placeholder="e.g. Reduce average grievance resolution time from 15 days to 5 days."
            style="min-height:120px">${esc(existing?.desiredOutcome ?? '')}</textarea>
          <p class="form-help">Focus on the result, not the solution. Measurable outcomes are preferred.</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-success">Success Criteria</label>
          <textarea class="form-textarea" id="f-success" rows="3"
            placeholder="e.g. Citizens receive resolution within 5 working days for 90% of eligible complaints.">${esc(existing?.successCriteria ?? '')}</textarea>
        </div>
      </div>

      <!-- SECTION 3: Context -->
      <div class="form-section">
        <div class="form-section-header">
          <div class="form-section-title">Context</div>
          <div class="form-section-desc">Classification, location, affected population, and timeline.</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-domain">Domain <span class="req">*</span></label>
            <select class="form-select" id="f-domain">
              <option value="">— Select domain —</option>
              ${DOMAINS.map(d => `<option value="${esc(d)}" ${existing?.domain === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f-subdomain">Sub-Domain</label>
            <input class="form-input" type="text" id="f-subdomain" maxlength="100"
              placeholder="e.g. Complaint Management"
              value="${esc(existing?.subDomain ?? '')}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-geo-scope">Geographic Scope</label>
            <input class="form-input" type="text" id="f-geo-scope" maxlength="500"
              placeholder="e.g. Mumbai Municipal Corporation"
              value="${esc(existing?.geographicScope ?? '')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-op-scope">Operational Scope</label>
            <input class="form-input" type="text" id="f-op-scope" maxlength="500"
              placeholder="e.g. Department of Water Supply, all divisions"
              value="${esc(existing?.operationalScope ?? '')}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-pop">Affected Population</label>
            <input class="form-input" type="text" id="f-pop" maxlength="500"
              placeholder="e.g. Citizens filing municipal complaints"
              value="${esc(existing?.affectedPopulation ?? '')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-pop-est">Approx. Population Estimate</label>
            <input class="form-input" type="number" id="f-pop-est" min="0"
              placeholder="Optional number"
              value="${existing?.affectedPopulationEstimate ?? ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-start">Expected Start Date</label>
            <input class="form-input" type="date" id="f-start"
              value="${existing?.expectedStartDate ? existing.expectedStartDate.substring(0,10) : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-target">Expected Target Date</label>
            <input class="form-input" type="date" id="f-target"
              value="${existing?.expectedTargetDate ? existing.expectedTargetDate.substring(0,10) : ''}" />
          </div>
        </div>
        <div class="form-group" style="max-width:260px">
          <label class="form-label" for="f-urgency">Urgency</label>
          <select class="form-select" id="f-urgency">
            <option value="">— Not specified —</option>
            ${URGENCY_OPTIONS.map(u => `<option value="${u}" ${existing?.urgency === u ? 'selected' : ''}>${u.charAt(0) + u.slice(1).toLowerCase()}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- SECTION 4: Constraints -->
      <div class="form-section">
        <div class="form-section-header">
          <div class="form-section-title">Constraints</div>
          <div class="form-section-desc">Known limitations that any solution must work within.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-constraints">Constraints</label>
          <textarea class="form-textarea" id="f-constraints" rows="4"
            placeholder="e.g. Budget cap of ₹50 lakh. Must integrate with existing GRM software. No cloud data storage.">${esc(existing?.constraints ?? '')}</textarea>
        </div>
      </div>

      <!-- SECTION 5: Measurement Context -->
      <div class="form-section">
        <div class="form-section-header">
          <div class="form-section-title">Measurement Context</div>
          <div class="form-section-desc">Baseline information and initial KPIs. These can be updated later.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-baseline">Baseline Information</label>
          <textarea class="form-textarea" id="f-baseline" rows="4"
            placeholder="Current measurements, data availability, or note if baseline is not yet established.">${esc(existing?.baselineInformation ?? '')}</textarea>
          <p class="form-help">Optional. If baseline data is not available, indicate that here.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Initial KPIs</label>
          <p class="form-help" style="margin-bottom:var(--space-3)">Optional initial success indicators. Module 3 will assist in refining these.</p>
          <div id="kpi-builder-wrap"></div>
        </div>
      </div>

      <!-- SECTION 6: Additional -->
      <div class="form-section">
        <div class="form-section-header">
          <div class="form-section-title">Additional Information</div>
          <div class="form-section-desc">Any other relevant context.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-context">Additional Context</label>
          <textarea class="form-textarea" id="f-context" rows="4"
            placeholder="Previous attempts, relevant background, existing initiatives, known dependencies.">${esc(existing?.additionalContext ?? '')}</textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <div class="form-actions-left"></div>
        <button type="button" class="btn btn-outline" id="cancel-btn">Cancel</button>
        <button type="button" class="btn btn-outline" id="save-draft-btn">
          <span id="save-text">Save Draft</span>
          <span id="save-spinner" class="spinner hidden" style="width:16px;height:16px;border-width:2px;" aria-hidden="true"></span>
        </button>
        <button type="button" class="btn btn-primary" id="submit-btn" style="background-color:#0f2554;border-color:#0f2554">
          <span id="submit-text">Submit Problem</span>
          <span id="submit-spinner" class="spinner hidden" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,.3);border-top-color:#fff;" aria-hidden="true"></span>
        </button>
      </div>

    </form>
  `;

  renderKPIBuilder();

  document.getElementById('back-btn').addEventListener('click', () => { window.location.hash = 'needs'; });
  document.getElementById('cancel-btn').addEventListener('click', () => { window.location.hash = 'needs'; });
  document.getElementById('save-draft-btn').addEventListener('click', () => handleSave(false, isEdit, needId));
  document.getElementById('submit-btn').addEventListener('click', () => handleSave(true, isEdit, needId));
}

// ── Collect form data ──────────────────────────────────────────
function collectFormData() {
  const kpisClean = _kpis
    .filter(k => k.name?.trim())
    .map(k => ({
      name:         k.name?.trim()         || '',
      currentValue: k.currentValue?.trim() || '',
      targetValue:  k.targetValue?.trim()  || '',
      unit:         k.unit?.trim()         || '',
    }));

  return {
    title:                val('f-title').trim(),
    problemStatement:     val('f-problem').trim(),
    currentSituation:     val('f-current').trim() || null,
    existingProcess:      val('f-process').trim() || null,
    desiredOutcome:       val('f-outcome').trim(),
    successCriteria:      val('f-success').trim() || null,
    domain:               val('f-domain'),
    subDomain:            val('f-subdomain').trim() || null,
    geographicScope:      val('f-geo-scope').trim() || null,
    operationalScope:     val('f-op-scope').trim() || null,
    affectedPopulation:   val('f-pop').trim() || null,
    affectedPopulationEstimate: val('f-pop-est') ? parseInt(val('f-pop-est')) : null,
    expectedStartDate:    val('f-start') || null,
    expectedTargetDate:   val('f-target') || null,
    urgency:              val('f-urgency') || null,
    constraints:          val('f-constraints').trim() || null,
    baselineInformation:  val('f-baseline').trim() || null,
    initialKPIs:          kpisClean.length ? kpisClean : null,
    additionalContext:    val('f-context').trim() || null,
  };
}

// ── Save (draft or submit) ─────────────────────────────────────
async function handleSave(doSubmit, isEdit, needId) {
  const alertEl   = document.getElementById('form-alert');
  const successEl = document.getElementById('form-success');
  alertEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const saveBtn    = document.getElementById('save-draft-btn');
  const saveText   = document.getElementById('save-text');
  const saveSpin   = document.getElementById('save-spinner');
  const submitBtn  = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  const submitSpin = document.getElementById('submit-spinner');

  const setLoading = (on) => {
    saveBtn.disabled = on; submitBtn.disabled = on;
    if (doSubmit) {
      submitText.textContent = on ? 'Submitting…' : 'Submit Problem';
      submitSpin.classList.toggle('hidden', !on);
    } else {
      saveText.textContent = on ? 'Saving…' : 'Save Draft';
      saveSpin.classList.toggle('hidden', !on);
    }
  };

  const data = collectFormData();

  // Client-side required check on submit
  if (doSubmit) {
    const missing = [];
    if (!data.title)            missing.push('Title');
    if (!data.problemStatement) missing.push('Problem Statement');
    if (!data.desiredOutcome)   missing.push('Desired Outcome');
    if (!data.domain)           missing.push('Domain');
    if (missing.length) {
      alertEl.textContent = `Required fields missing: ${missing.join(', ')}.`;
      alertEl.classList.remove('hidden');
      alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  setLoading(true);
  try {
    let saved;
    if (isEdit && needId) {
      saved = await governmentNeedService.updateNeed(needId, data);
    } else {
      saved = await governmentNeedService.createNeed(data);
    }
    const savedNeed = saved.need ?? saved;

    if (doSubmit) {
      await governmentNeedService.submitNeed(savedNeed.id);
      window.location.hash = `needs-view-${savedNeed.id}`;
    } else {
      successEl.textContent = 'Draft saved successfully.';
      successEl.classList.remove('hidden');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Update hash to edit mode with the real id (for new records)
      if (!isEdit) {
        window.location.replace(`#needs-edit-${savedNeed.id}`);
      }
    }
  } catch (err) {
    let msg = err.message;
    if (err instanceof ApiError && err.fields) {
      msg = err.fields.map(f => `${f.field}: ${f.message}`).join(' | ');
    }
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    setLoading(false);
  }
}
