/**
 * NIVARAN — Government Need Controller (Module 2)
 */

import * as needService from '../services/governmentNeed.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

function userContext(req) {
  return {
    userId:    req.user.sub,
    userRoles: req.user.roles ?? [],
    userOrgId: req.user.organizationId,
    userUnitId: req.user.organizationalUnitId,
  };
}

export async function listNeeds(req, res, next) {
  try {
    const { userId, userRoles, userOrgId } = userContext(req);
    const page   = parseInt(req.query.page,  10) || 1;
    const limit  = parseInt(req.query.limit, 10) || 20;
    const status = req.query.status || undefined;
    const domain = req.query.domain || undefined;

    const { needs, pagination } = await needService.listNeeds({ userId, userRoles, userOrgId, page, limit, status, domain });
    return sendPaginated(res, needs, pagination);
  } catch (err) { next(err); }
}

export async function getNeed(req, res, next) {
  try {
    const { userId, userRoles, userOrgId } = userContext(req);
    const need = await needService.getNeedById(req.params.id, userId, userRoles, userOrgId);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function createNeed(req, res, next) {
  try {
    const { userId, userOrgId, userUnitId } = userContext(req);
    const need = await needService.createNeed(req.body, userId, userOrgId, userUnitId);
    return sendSuccess(res, { need }, 201);
  } catch (err) { next(err); }
}

export async function updateNeed(req, res, next) {
  try {
    const { userId, userRoles, userOrgId } = userContext(req);
    const need = await needService.updateNeed(req.params.id, req.body, userId, userRoles, userOrgId);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function submitNeed(req, res, next) {
  try {
    const { userId, userRoles, userOrgId } = userContext(req);
    const need = await needService.submitNeed(req.params.id, userId, userRoles, userOrgId);
    return sendSuccess(res, { need });
  } catch (err) { next(err); }
}

export async function deleteNeed(req, res, next) {
  try {
    const { userId, userRoles, userOrgId } = userContext(req);
    await needService.deleteNeed(req.params.id, userId, userRoles, userOrgId);
    return sendSuccess(res, { message: 'Government need deleted.' });
  } catch (err) { next(err); }
}
