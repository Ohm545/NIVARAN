/**
 * NIVARAN — Auth Service (Frontend)
 *
 * Login, logout, token storage, current user cache.
 */

import { api } from '../api.js';

let _currentUser = null;

export const authService = {
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    _currentUser = data.user;
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout', {});
    } catch { /* ignore errors on logout */ }
    localStorage.removeItem('token');
    _currentUser = null;
    window.location.replace('login.html');
  },

  async fetchCurrentUser() {
    if (_currentUser) return _currentUser;
    const data = await api.get('/auth/me');
    _currentUser = data.user;
    return _currentUser;
  },

  clearCache() {
    _currentUser = null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isLoggedIn() {
    return Boolean(this.getToken());
  },

  /**
   * Returns cached user roles as array of role name strings.
   * @returns {string[]}
   */
  getRoleNames() {
    return (_currentUser?.roles ?? []).map(r => r.name ?? r);
  },

  hasRole(roleName) {
    return this.getRoleNames().includes(roleName);
  },

  /**
   * Returns flat array of all permission names across all roles.
   * @returns {string[]}
   */
  getPermissions() {
    const perms = new Set();
    for (const role of (_currentUser?.roles ?? [])) {
      for (const p of (role.permissions ?? [])) {
        perms.add(p);
      }
    }
    return [...perms];
  },

  hasPermission(permName) {
    return this.getPermissions().includes(permName);
  },
};
