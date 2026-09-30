/**
 * NIVARAN — Organization Service (Frontend)
 */

import { api } from '../api.js';

export const organizationService = {
  listOrganizations() {
    return api.get('/organizations');
  },

  getOrganization(id) {
    return api.get(`/organizations/${id}`);
  },

  createOrganization(data) {
    return api.post('/organizations', data);
  },

  updateOrganization(id, data) {
    return api.put(`/organizations/${id}`, data);
  },

  listUnits(organizationId) {
    return api.get(`/organizations/${organizationId}/units`);
  },

  createUnit(organizationId, data) {
    return api.post(`/organizations/${organizationId}/units`, data);
  },

  listRoles() {
    return api.get('/roles');
  },
};
