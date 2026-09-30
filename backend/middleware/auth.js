/**
 * NIVARAN — Authentication & Authorization Middleware
 *
 * authenticate()        — verifies JWT; attaches decoded payload to req.user
 * requirePermission()   — checks a specific permission against the DB
 * requireRole()         — checks role membership (fast, from token)
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userHasPermission } from '../services/permission.service.js';

// ── Authentication ─────────────────────────────────────────────

/**
 * Verify Bearer JWT. Sets req.user with the decoded payload.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token.' } });
  }
}

// ── Permission-based authorization ────────────────────────────

/**
 * Middleware factory: checks that the authenticated user holds a specific permission.
 * Permission is validated against the database (not just the JWT payload).
 *
 * Usage: router.get('/users', authenticate, requirePermission('USER_VIEW'), controller)
 */
export function requirePermission(permissionName) {
  return async (req, res, next) => {
    if (!req.user?.sub) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    try {
      const allowed = await userHasPermission(req.user.sub, permissionName);
      if (!allowed) {
        return res.status(403).json({ success: false, error: { message: 'You do not have permission to perform this action.' } });
      }
      next();
    } catch {
      return res.status(500).json({ success: false, error: { message: 'Authorization check failed.' } });
    }
  };
}

// ── Role-based authorization (fast, uses JWT payload) ─────────

/**
 * Middleware factory: checks that the user's token includes one of the given roles.
 * Note: this trusts the token payload; use requirePermission() for critical ops.
 *
 * Usage: requireRole('SYSTEM_ADMIN')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles ?? [];
    const hasRole = roles.some(r => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ success: false, error: { message: 'Insufficient permissions.' } });
    }
    next();
  };
}

// ── Organization scope check ───────────────────────────────────

/**
 * Middleware factory: ensures the user belongs to the organization
 * specified in req.params.organizationId (or falls through for SYSTEM_ADMIN).
 */
export function requireOrganizationScope(req, res, next) {
  const userRoles   = req.user?.roles ?? [];
  const targetOrgId = req.params.organizationId;

  // SYSTEM_ADMIN has unrestricted scope
  if (userRoles.includes('SYSTEM_ADMIN')) return next();

  if (targetOrgId && req.user?.organizationId !== targetOrgId) {
    return res.status(403).json({ success: false, error: { message: 'Access denied: outside your organizational scope.' } });
  }

  next();
}
