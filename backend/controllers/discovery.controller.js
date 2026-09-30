/**
 * NIVARAN — Discovery Controller (Module 5)
 */

import * as ds from '../services/discovery.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function ctx(req) {
  return {
    actorId:   req.user.sub,
    userRoles: req.user.roles ?? [],
    userOrgId: req.user.organizationId,
  };
}

// ── Discovery Criteria ────────────────────────────────────────
export async function getCriteria(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const criteria = await ds.getOrCreateCriteria(req.params.needId, userRoles, userOrgId);
    return sendSuccess(res, { criteria });
  } catch (err) { next(err); }
}

export async function updateCriteria(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const criteria = await ds.updateCriteria(req.params.needId, req.body, userRoles, userOrgId);
    return sendSuccess(res, { criteria });
  } catch (err) { next(err); }
}

// ── Discovery Runs ────────────────────────────────────────────
export async function listRuns(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const runs = await ds.listDiscoveryRuns(req.params.needId, userRoles, userOrgId);
    return sendSuccess(res, { runs });
  } catch (err) { next(err); }
}

export async function startRun(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const result = await ds.runDiscovery(req.params.needId, actorId, userRoles, userOrgId);
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
}

export async function getRun(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const run = await ds.getDiscoveryRun(req.params.runId, userRoles, userOrgId);
    return sendSuccess(res, { run });
  } catch (err) { next(err); }
}

export async function getRunCandidates(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const filters = { matchStatus: req.query.matchStatus || undefined };
    const candidates = await ds.getRunCandidates(req.params.runId, userRoles, userOrgId, filters);
    return sendSuccess(res, { candidates });
  } catch (err) { next(err); }
}

// ── Candidates ────────────────────────────────────────────────
export async function getCandidate(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const candidate = await ds.getCandidate(req.params.id, userRoles, userOrgId);
    return sendSuccess(res, { candidate });
  } catch (err) { next(err); }
}

export async function markUnderReview(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const c = await ds.markUnderReview(req.params.id, actorId, userRoles, userOrgId, req.body.note);
    return sendSuccess(res, { candidate: c });
  } catch (err) { next(err); }
}

export async function shortlistCandidate(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const c = await ds.shortlistCandidate(req.params.id, actorId, userRoles, userOrgId, req.body.note);
    return sendSuccess(res, { candidate: c });
  } catch (err) { next(err); }
}

export async function markNotRelevant(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const c = await ds.markNotRelevant(req.params.id, actorId, userRoles, userOrgId, req.body.reason);
    return sendSuccess(res, { candidate: c });
  } catch (err) { next(err); }
}

// ── Solutions catalog ─────────────────────────────────────────
export async function listSolutions(req, res, next) {
  try {
    const page   = parseInt(req.query.page, 10)  || 1;
    const limit  = parseInt(req.query.limit, 10) || 20;
    const { domain, providerType, search } = req.query;
    const result = await ds.listSolutions({ page, limit, domain, providerType, search });
    return sendPaginated(res, result.solutions, result.pagination);
  } catch (err) { next(err); }
}
