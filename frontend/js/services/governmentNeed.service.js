/**
 * NIVARAN — Government Need API Service (Frontend)
 */

import { api } from '../api.js';

export const governmentNeedService = {
  listNeeds(params = {}) {
    const q = new URLSearchParams();
    if (params.page)   q.set('page',   params.page);
    if (params.limit)  q.set('limit',  params.limit);
    if (params.status) q.set('status', params.status);
    if (params.domain) q.set('domain', params.domain);
    const qs = q.toString();
    return api.get(`/government-needs${qs ? '?' + qs : ''}`);
  },

  getNeed(id) {
    return api.get(`/government-needs/${id}`);
  },

  createNeed(data) {
    return api.post('/government-needs', data);
  },

  updateNeed(id, data) {
    return api.put(`/government-needs/${id}`, data);
  },

  submitNeed(id) {
    return api.post(`/government-needs/${id}/submit`, {});
  },

  deleteNeed(id) {
    return api.delete(`/government-needs/${id}`);
  },
};
