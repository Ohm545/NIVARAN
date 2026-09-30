/**
 * NIVARAN — Approval Controller (Module 4)
 */

import * as approvalService from '../services/approval.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function ctx(req) {
  return {
    actorId:   req.user.sub,
    userRoles: req.user.roles ?? [],
    userOrgId: req.user.organizationId,
  };
}

export async function listApprovals(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const page   = parseInt(req.query.page,   10) || 1;
    const limit  = parseInt(req.query.limit,  10) || 20;
    const status = req.query.status || undefined;

    const { needs, pagination } = await approvalService.listAllForAuthority({ userRoles, userOrgId, status, page, limit });
    return sendPaginated(res, needs, pagination);
  } catch (err) { next(err); }
}

export async function approveNeed(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const comment = req.body.comment || null;
    const need = await approvalService.approveNeed(req.params.id, actorId, userRoles, userOrgId, comment);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function rejectNeed(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const need = await approvalService.rejectNeed(req.params.id, actorId, userRoles, userOrgId, req.body.reason);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function sendBackNeed(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const need = await approvalService.sendBackNeed(req.params.id, actorId, userRoles, userOrgId, req.body.reason);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function resubmitNeed(req, res, next) {
  try {
    const { actorId, userRoles, userOrgId } = ctx(req);
    const need = await approvalService.resubmitNeed(req.params.id, actorId, userRoles, userOrgId);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function getReviewHistory(req, res, next) {
  try {
    const { userRoles, userOrgId } = ctx(req);
    const history = await approvalService.getReviewHistory(req.params.id, userRoles, userOrgId);
    return sendSuccess(res, { history });
  } catch (err) { next(err); }
}
