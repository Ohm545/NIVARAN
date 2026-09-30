/**
 * NIVARAN — App Entry Point
 *
 * Bootstraps the application.
 * Page-specific modules are loaded dynamically as features are added.
 */

import { initHeader } from './components/header.js';
import { initFooter } from './components/footer.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initFooter();

  console.log('[NIVARAN] App initialised.');
});
