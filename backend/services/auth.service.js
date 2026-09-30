/**
 * NIVARAN — Auth Service
 *
 * Handles login, token generation, and current-user lookup.
 * Never returns passwordHash.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { env } from '../config/env.js';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Safe user projection — strips passwordHash and any internal fields.
 */
export function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Build the user payload attached to a JWT.
 * Keep this small — it lives in every request.
 */
function buildTokenPayload(user, roles) {
  return {
    sub:             user.id,
    email:           user.email,
    name:            user.name,
    status:          user.status,
    organizationId:  user.organizationId,
    organizationalUnitId: user.organizationalUnitId,
    roles:           roles.map(r => r.name),
  };
}

// ── Auth operations ───────────────────────────────────────────

/**
 * Authenticate a user by email + password.
 * Returns { token, user } on success.
 * Throws on invalid credentials or inactive account.
 */
export async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      userRoles: { include: { role: true } },
      organization: { select: { id: true, name: true, code: true } },
      organizationalUnit: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
  }

  if (user.status !== 'ACTIVE') {
    throw Object.assign(new Error('Your account is inactive. Please contact your administrator.'), { status: 403 });
  }

  const roles = user.userRoles.map(ur => ur.role);
  const payload = buildTokenPayload(user, roles);
  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

  return {
    token,
    user: {
      id:                  user.id,
      name:                user.name,
      email:               user.email,
      status:              user.status,
      organization:        user.organization,
      organizationalUnit:  user.organizationalUnit,
      roles:               roles.map(r => ({ id: r.id, name: r.name, displayName: r.displayName })),
    },
  };
}

/**
 * Fetch the full authenticated user record for /auth/me.
 * Returns safe user object.
 */
export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      organization: { select: { id: true, name: true, code: true } },
      organizationalUnit: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }

  const { passwordHash, ...safeUserData } = user;

  return {
    ...safeUserData,
    roles: user.userRoles.map(ur => ({
      id:          ur.role.id,
      name:        ur.role.name,
      displayName: ur.role.displayName,
      permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
    })),
  };
}
