/**
 * NIVARAN — App Shell
 *
 * Handles:
 *  - Auth guard (redirects unauthenticated users to login)
 *  - Sidebar rendering with role-aware navigation
 *  - Client-side routing via URL hash
 *  - Page module loading
 *  - Sidebar collapse toggle
 */

import { authService } from './services/auth.service.js';
import { ApiError }    from './api.js';

// ── Navigation definition ─────────────────────────────────────
// requiredPermission: if set, link only shows when user has that permission.
// module: used to load the page js module dynamically.

const NAV_ITEMS = [
  {
    section: 'Workspace',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        module: 'overview',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      },
    ],
  },
  {
    section: 'Procurement',
    items: [
      {
        id: 'needs',
        label: 'Government Needs',
        module: 'needs',
        requiredPermission: 'PROBLEM_VIEW',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      },
      {
        id: 'solutions',
        label: 'Solutions',
        module: 'coming-soon',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      },
      {
        id: 'evaluations',
        label: 'Evaluations',
        module: 'coming-soon',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      },
      {
        id: 'pilots',
        label: 'Pilots',
        module: 'coming-soon',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      },
      {
        id: 'validation',
        label: 'Validation',
        module: 'coming-soon',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      },
      {
        id: 'procurement',
        label: 'Procurement',
        module: 'coming-soon',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
      },
      {
        id: 'knowledge',
        label: 'Knowledge',
        module: 'coming-soon',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      },
    ],
  },
  {
    section: 'System',
    items: [
      {
        id: 'approvals',
        label: 'Approvals',
        module: 'approvals',
        requiredPermission: 'APPROVAL_VIEW',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      },
      {
        id: 'administration',
        label: 'Administration',
        module: 'admin',
        requiredPermission: 'USER_VIEW',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
      },
    ],
  },
];

// ── Page module map ───────────────────────────────────────────

const PAGE_MODULES = {
  overview:       () => import('./pages/dashboard.page.js'),
  admin:          () => import('./pages/admin.page.js'),
  needs:          () => import('./pages/needs.page.js'),
  'needs-create': () => import('./pages/needs-form.page.js'),
  approvals:      () => import('./pages/approvals.page.js'),
  'coming-soon':  null,
};

// ── State ─────────────────────────────────────────────────────

let currentUser = null;
let activePageId = null;

// ── Init ──────────────────────────────────────────────────────

async function init() {
  if (!authService.isLoggedIn()) {
    window.location.replace('login.html');
    return;
  }

  try {
    currentUser = await authService.fetchCurrentUser();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.replace('login.html');
      return;
    }
    renderFatalError('Failed to load your account. Please refresh.');
    return;
  }

  renderSidebar();
  renderUserContext();
  renderTopbarContext();
  setupLogout();
  setupSidebarToggle();
  setupHashRouting();
  navigateToHash();
}

// ── Sidebar ───────────────────────────────────────────────────

function renderSidebar() {
  const list = document.getElementById('sidebar-nav-list');
  if (!list) return;

  const userPermissions = authService.getPermissions();
  let html = '';

  for (const section of NAV_ITEMS) {
    // Filter items by permission
    const visibleItems = section.items.filter(item => {
      if (!item.requiredPermission) return true;
      return userPermissions.includes(item.requiredPermission);
    });

    if (!visibleItems.length) continue;

    html += `<li class="sidebar-section-label">${escHtml(section.section)}</li>`;

    for (const item of visibleItems) {
      html += `
        <li class="sidebar-nav-item">
          <button
            class="sidebar-nav-link"
            data-page="${escHtml(item.id)}"
            aria-label="${escHtml(item.label)}"
            type="button"
          >
            ${item.icon}
            <span class="nav-label">${escHtml(item.label)}</span>
          </button>
        </li>
      `;
    }
  }

  list.innerHTML = html;

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn) return;
    const pageId = btn.dataset.page;
    window.location.hash = pageId;
  });
}

function setActiveNav(pageId) {
  document.querySelectorAll('.sidebar-nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
}

// ── User context (sidebar footer) ────────────────────────────

function renderUserContext() {
  const el = document.getElementById('user-context');
  if (!el || !currentUser) return;

  const orgName  = currentUser.organization?.name  || 'No organization';
  const unitName = currentUser.organizationalUnit?.name || '';
  const roles    = (currentUser.roles ?? []).map(r => r.displayName ?? r.name).join(', ') || 'No role';

  el.innerHTML = `
    <div class="user-context-name">${escHtml(currentUser.name)}</div>
    <div class="user-context-org">${escHtml(orgName)}${unitName ? ' · ' + escHtml(unitName) : ''}</div>
    <span class="user-context-role">${escHtml(roles)}</span>
  `;
}

// ── Topbar context ────────────────────────────────────────────

function renderTopbarContext() {
  const el = document.getElementById('topbar-context');
  if (!el || !currentUser) return;

  const orgName  = currentUser.organization?.name || '';
  const unitName = currentUser.organizationalUnit?.name || '';

  if (orgName) {
    el.innerHTML = `<strong>${escHtml(orgName)}</strong>${unitName ? ' &nbsp;·&nbsp; ' + escHtml(unitName) : ''}`;
  }
}

// ── Logout ────────────────────────────────────────────────────

function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', () => authService.logout());
}

// ── Sidebar toggle ────────────────────────────────────────────

function setupSidebarToggle() {
  const btn     = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ── Routing ───────────────────────────────────────────────────

function setupHashRouting() {
  window.addEventListener('hashchange', navigateToHash);
}

function navigateToHash() {
  const hash = window.location.hash.replace('#', '') || 'overview';
  loadPage(hash);
}

async function loadPage(pageId) {
  // Sub-routes with dynamic IDs must always reload
  const isDynamic = pageId.startsWith('needs-view-') || pageId.startsWith('needs-edit-') || pageId === 'needs-create' || pageId.startsWith('approvals-review-');
  if (!isDynamic && activePageId === pageId) return;
  activePageId = pageId;
  setActiveNav(pageId);

  const content = document.getElementById('page-content');
  if (!content) return;

  // Show loading state
  content.innerHTML = `
    <div class="flex-center" style="height: 200px;">
      <div class="spinner"></div>
    </div>
  `;

  // ── Dynamic sub-routes ─────────────────────────────────────
  // approvals-review-<uuid>
  if (pageId.startsWith('approvals-review-')) {
    const needId = pageId.replace('approvals-review-', '');
    setActiveNav('approvals');
    try {
      const mod = await import('./pages/approvals-review.page.js');
      await mod.initPage(content, currentUser, { needId });
    } catch (err) { renderPageError(content, err); }
    return;
  }

  // needs-view-<uuid>
  if (pageId.startsWith('needs-view-')) {
    const needId = pageId.replace('needs-view-', '');
    setActiveNav('needs');
    try {
      const mod = await import('./pages/needs-detail.page.js');
      await mod.initPage(content, currentUser, { needId });
    } catch (err) { renderPageError(content, err); }
    return;
  }

  // needs-edit-<uuid>
  if (pageId.startsWith('needs-edit-')) {
    const needId = pageId.replace('needs-edit-', '');
    setActiveNav('needs');
    try {
      const mod = await import('./pages/needs-form.page.js');
      await mod.initPage(content, currentUser, { mode: 'edit', needId });
    } catch (err) { renderPageError(content, err); }
    return;
  }

  // needs-create
  if (pageId === 'needs-create') {
    setActiveNav('needs');
    try {
      const mod = await import('./pages/needs-form.page.js');
      await mod.initPage(content, currentUser, { mode: 'create' });
    } catch (err) { renderPageError(content, err); }
    return;
  }


    const needId = pageId.replace('needs-view-', '');
    setActiveNav('needs');
    try {
      const mod = await import('./pages/needs-detail.page.js');
      await mod.initPage(content, currentUser, { needId });
    } catch (err) { renderPageError(content, err); }
    return;
  }

  // needs-edit-<uuid>
  if (pageId.startsWith('needs-edit-')) {
    const needId = pageId.replace('needs-edit-', '');
    setActiveNav('needs');
    try {
      const mod = await import('./pages/needs-form.page.js');
      await mod.initPage(content, currentUser, { mode: 'edit', needId });
    } catch (err) { renderPageError(content, err); }
    return;
  }

  // needs-create
  if (pageId === 'needs-create') {
    setActiveNav('needs');
    try {
      const mod = await import('./pages/needs-form.page.js');
      await mod.initPage(content, currentUser, { mode: 'create' });
    } catch (err) { renderPageError(content, err); }
    return;
  }  // Coming soon pages
  if (pageId === 'coming-soon' || !PAGE_MODULES[pageId]) {
    const label = getNavLabel(pageId);
    content.innerHTML = `
      <div class="coming-soon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2>${escHtml(label)}</h2>
        <p>This module is not yet available. It will be enabled in a future release.</p>
      </div>
    `;
    return;
  }

  try {
    const mod = await PAGE_MODULES[pageId]();
    if (typeof mod.initPage === 'function') {
      await mod.initPage(content, currentUser);
    } else {
      content.innerHTML = '<p class="text-muted" style="padding:2rem">Page module loaded but no initPage() export found.</p>';
    }
  } catch (err) {
    renderPageError(content, err);
  }
}

function renderPageError(content, err) {
  if (err instanceof ApiError && err.status === 403) {
    content.innerHTML = `
      <div class="forbidden-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    `;
  } else {
    console.error('[NIVARAN] Page load error:', err);
    content.innerHTML = `
      <div class="coming-soon">
        <h2>Something went wrong</h2>
        <p>${escHtml(err.message)}</p>
      </div>
    `;
  }
}

// ── Helpers ───────────────────────────────────────────────────

function getNavLabel(pageId) {
  for (const section of NAV_ITEMS) {
    const item = section.items.find(i => i.id === pageId);
    if (item) return item.label;
  }
  return pageId;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFatalError(msg) {
  document.body.innerHTML = `
    <div class="flex-center" style="min-height:100vh;flex-direction:column;gap:1rem;padding:2rem;text-align:center;">
      <p style="color:#dc2626;font-weight:600;">${escHtml(msg)}</p>
      <a href="login.html" style="color:#2563eb;">Return to login</a>
    </div>
  `;
}

// ── Bootstrap ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
