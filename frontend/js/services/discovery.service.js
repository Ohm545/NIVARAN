/**
 * NIVARAN — Discovery Service (Frontend, Module 5)
 */

import { api } from '../api.js';

export const discoveryService = {
  getCriteria(needId)         { return api.get(`/government-needs/${needId}/discovery-criteria`); },
  updateCriteria(needId, data){ return api.put(`/government-needs/${needId}/discovery-criteria`, data); },
  listRuns(needId)            { return api.get(`/government-needs/${needId}/discovery-runs`); },
  startRun(needId)            { return api.post(`/government-needs/${needId}/discovery-runs`, {}); },
  getRun(runId)               { return api.get(`/discovery-runs/${runId}`); },
  getRunCandidates(runId, matchStatus) {
    const q = matchStatus ? `?matchStatus=${matchStatus}` : '';
    return api.get(`/discovery-runs/${runId}/candidates${q}`);
  },
  getCandidate(id)            { return api.get(`/discovery-candidates/${id}`); },
  markUnderReview(id, note)   { return api.post(`/discovery-candidates/${id}/under-review`, { note: note || '' }); },
  shortlist(id, note)         { return api.post(`/discovery-candidates/${id}/shortlist`, { note: note || '' }); },
  markNotRelevant(id, reason) { return api.post(`/discovery-candidates/${id}/not-relevant`, { reason }); },
  listSolutions(params = {}) {
    const q = new URLSearchParams();
    if (params.page)         q.set('page',   params.page);
    if (params.limit)        q.set('limit',  params.limit);
    if (params.search)       q.set('search', params.search);
    if (params.domain)       q.set('domain', params.domain);
    return api.get(`/solutions${q.toString() ? '?' + q.toString() : ''}`);
  },
};
