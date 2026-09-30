/**
 * NIVARAN — Auth Controller
 */

import * as authService from '../services/auth.service.js';
import { createAuditLog } from '../services/audit.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function login(req, res, next) {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    const result = await authService.login(email, password);

    await createAuditLog({
      actorId:    result.user.id,
      action:     'LOGIN_SUCCESS',
      entityType: 'User',
      entityId:   result.user.id,
      organizationId: result.user.organization?.id || null,
      ipAddress,
      userAgent,
    });

    return sendSuccess(res, result, 200);
  } catch (err) {
    await createAuditLog({
      actorId:   null,
      action:    'LOGIN_FAILURE',
      entityType:'User',
      metadata:  { email },
      ipAddress,
      userAgent,
    });
    next(err);
  }
}

export async function logout(req, res) {
  if (req.user?.sub) {
    await createAuditLog({
      actorId:    req.user.sub,
      action:     'LOGOUT',
      entityType: 'User',
      entityId:   req.user.sub,
      organizationId: req.user.organizationId || null,
    });
  }
  return sendSuccess(res, { message: 'Logged out successfully.' });
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.sub);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}
