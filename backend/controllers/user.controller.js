/**
 * NIVARAN — User Controller
 */

import * as userService from '../services/user.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export async function listUsers(req, res, next) {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { organizationId } = req.query;

    const { users, pagination } = await userService.listUsers({ page, limit, organizationId });
    return sendPaginated(res, users, pagination);
  } catch (err) { next(err); }
}

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body, req.user.sub);
    return sendSuccess(res, { user }, 201);
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user.sub);
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}

export async function activateUser(req, res, next) {
  try {
    const user = await userService.setUserStatus(req.params.id, 'ACTIVE', req.user.sub);
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}

export async function deactivateUser(req, res, next) {
  try {
    const user = await userService.setUserStatus(req.params.id, 'INACTIVE', req.user.sub);
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}

export async function assignRoles(req, res, next) {
  try {
    const user = await userService.assignRoles(req.params.id, req.body.roleIds, req.user.sub);
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}

export async function assignOrganization(req, res, next) {
  try {
    const { organizationId, organizationalUnitId } = req.body;
    const user = await userService.assignOrganization(
      req.params.id,
      organizationId,
      organizationalUnitId,
      req.user.sub
    );
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}
