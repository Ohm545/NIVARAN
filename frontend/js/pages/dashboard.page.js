/**
 * NIVARAN — Overview / Dashboard Page
 */

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function initPage(container, user) {
  const roles = (user?.roles ?? []).map(r => r.displayName ?? r.name).join(', ') || 'No role assigned';
  const org   = user?.organization?.name || 'No organization';
  const unit  = user?.organizationalUnit?.name || '';

  container.innerHTML = `
    <div class="page-header">
      <h1>Overview</h1>
      <p>Welcome to NIVARAN — Evidence-Driven Government Innovation Procurement.</p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Signed in as</div>
        <div class="stat-value" style="font-size:var(--text-lg)">${escHtml(user?.name ?? '')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Organization</div>
        <div class="stat-value" style="font-size:var(--text-lg)">${escHtml(org)}${unit ? ' · ' + escHtml(unit) : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Functional Role</div>
        <div class="stat-value" style="font-size:var(--text-base);font-weight:500">${escHtml(roles)}</div>
      </div>
    </div>

    <div class="card" style="max-width:640px;">
      <div class="card-header">
        <h2 class="card-title">Module Status</h2>
      </div>
      <p style="margin-bottom:var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted);">
        NIVARAN is being built incrementally. The modules below will become available in future releases.
      </p>
      <table class="data-table">
        <thead>
          <tr>
            <th>Module</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['Authentication & Organization',  'Active',       'success'],
            ['Government Needs',               'Coming soon',  'default'],
            ['Solution Discovery',             'Coming soon',  'default'],
            ['Technical Evaluation',           'Coming soon',  'default'],
            ['Pilot Management',               'Coming soon',  'default'],
            ['Independent Validation',         'Coming soon',  'default'],
            ['Procurement',                    'Coming soon',  'default'],
            ['Knowledge Analytics',            'Coming soon',  'default'],
          ].map(([name, status, badge]) => `
            <tr>
              <td>${escHtml(name)}</td>
              <td><span class="badge badge-${badge}">${escHtml(status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
