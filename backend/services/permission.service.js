/**
 * NIVARAN — Permission Service
 *
 * Resolves permissions for a user from their roles.
 * This is the single source of truth for authorization decisions.
 */

import prisma from '../config/database.js';

/**
 * Get all permission names for a given user (via their roles).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getUserPermissions(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: { select: { name: true, isActive: true } } },
          },
        },
      },
    },
  });

  const permissions = new Set();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      if (rp.permission.isActive) {
        permissions.add(rp.permission.name);
      }
    }
  }
  return [...permissions];
}

/**
 * Check if a user has a specific permission.
 * @param {string} userId
 * @param {string} permissionName
 * @returns {Promise<boolean>}
 */
export async function userHasPermission(userId, permissionName) {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionName);
}

/**
 * Check if a user has ALL of the specified permissions.
 * @param {string} userId
 * @param {string[]} permissionNames
 * @returns {Promise<boolean>}
 */
export async function userHasAllPermissions(userId, permissionNames) {
  const permissions = await getUserPermissions(userId);
  return permissionNames.every(p => permissions.includes(p));
}

/**
 * Get all role names for a user.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getUserRoleNames(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { name: true } } },
  });
  return userRoles.map(ur => ur.role.name);
}
