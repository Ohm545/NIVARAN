/**
 * NIVARAN — Footer Component
 */

export function initFooter() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  footer.innerHTML = `
    <p>&copy; ${new Date().getFullYear()} NIVARAN. All rights reserved.</p>
  `;
}
