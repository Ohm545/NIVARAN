/**
 * NIVARAN — User Service (Frontend)
 */

import { api } from '../api.js';

export const userService = {
  listUsers(params = {}) {
    const q = new URLSearchParams();
    if (params.page)           q.set('page',           params.page);
    if (params.limit)          q.set('limit',          params.limit);
    if (params.organizationId) q.set('organizationId', params.organizationId);
    const qs = q.toString();
    return api.get(`/users${qs ? '?' + qs : ''}`);
  },

  getUser(id) {
    return api.get(`/users/${id}`);
  },

  createUser(data) {
    return api.post('/users', data);
  },

  updateUser(id, data) {
    return api.put(`/users/${id}`, data);
  },

  activateUser(id) {
    return api.patch(`/users/${id}/activate`);
  },

  deactivateUser(id) {
    return api.patch(`/users/${id}/deactivate`);
  },

  assignRoles(id, roleIds) {
    return api.put(`/users/${id}/roles`, { roleIds });
  },

  assignOrganization(id, organizationId, organizationalUnitId) {
    return api.put(`/users/${id}/organization`, { organizationId, organizationalUnitId });
  },
};
