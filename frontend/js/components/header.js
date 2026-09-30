/**
 * NIVARAN — Header Component
 */

export function initHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  header.innerHTML = `
    <div class="container flex-between" style="height: 100%;">
      <a href="/" class="brand" style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-primary); text-decoration: none;">
        NIVARAN
      </a>
      <nav id="main-nav">
        <!-- Navigation links will be rendered here by page modules -->
      </nav>
    </div>
  `;
}
