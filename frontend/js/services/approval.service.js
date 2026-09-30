/**
 * NIVARAN — Approval Service (Frontend, Module 4)
 */

import { api } from '../api.js';

export const approvalService = {
  listApprovals(params = {}) {
    const q = new URLSearchParams();
    if (params.page)   q.set('page',   params.page);
    if (params.limit)  q.set('limit',  params.limit);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return api.get(`/approvals${qs ? '?' + qs : ''}`);
  },

  approveNeed(id, comment) {
    return api.post(`/government-needs/${id}/approve`, { comment: comment || '' });
  },

  rejectNeed(id, reason) {
    return api.post(`/government-needs/${id}/reject`, { reason });
  },

  sendBackNeed(id, reason) {
    return api.post(`/government-needs/${id}/send-back`, { reason });
  },

  resubmitNeed(id) {
    return api.post(`/government-needs/${id}/resubmit`, {});
  },

  getReviewHistory(id) {
    return api.get(`/government-needs/${id}/review-history`);
  },
};
