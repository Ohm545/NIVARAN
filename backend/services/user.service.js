/**
 * NIVARAN — User Service
 *
 * User CRUD, role assignment, activate/deactivate.
 * All operations record an audit log entry.
 */

import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { createAuditLog } from './audit.service.js';

const SALT_ROUNDS = 12;

// ── Projection ─────────────────────────────────────────────────

export function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function userWithRelations() {
  return {
    include: {
      organization:        { select: { id: true, name: true, code: true } },
      organizationalUnit:  { select: { id: true, name: true, code: true } },
      userRoles:           { include: { role: { select: { id: true, name: true, displayName: true } } } },
    },
  };
}

// ── List ────────────────────────────────────────────────────────

export async function listUsers({ page = 1, limit = 20, organizationId } = {}) {
  const skip = (page - 1) * limit;
  const where = organizationId ? { organizationId } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      ...userWithRelations(),
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(safeUser),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Get single ─────────────────────────────────────────────────

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    ...userWithRelations(),
  });
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
  return safeUser(user);
}

// ── Create ─────────────────────────────────────────────────────

export async function createUser(data, actorId) {
  const { name, email, password, organizationId, organizationalUnitId, roleIds, status = 'ACTIVE' } = data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw Object.assign(new Error('A user with this email already exists.'), { status: 409 });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      status,
      organizationId:       organizationId       || null,
      organizationalUnitId: organizationalUnitId || null,
      ...(roleIds?.length ? {
        userRoles: { create: roleIds.map(roleId => ({ roleId })) },
      } : {}),
    },
    ...userWithRelations(),
  });

  await createAuditLog({
    actorId,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    organizationId: user.organizationId,
    metadata: { name: user.name, email: user.email, status },
  });

  return safeUser(user);
}

// ── Update ─────────────────────────────────────────────────────

export async function updateUser(id, data, actorId) {
  const { name, email, organizationId, organizationalUnitId, status } = data;

  if (email) {
    const conflict = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), NOT: { id } },
    });
    if (conflict) throw Object.assign(new Error('Email already in use by another user.'), { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name  ? { name }  : {}),
      ...(email ? { email: email.toLowerCase().trim() } : {}),
      ...(status ? { status } : {}),
      ...(organizationId !== undefined       ? { organizationId }       : {}),
      ...(organizationalUnitId !== undefined ? { organizationalUnitId } : {}),
    },
    ...userWithRelations(),
  });

  await createAuditLog({
    actorId,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: user.id,
    organizationId: user.organizationId,
    metadata: { changes: data },
  });

  return safeUser(user);
}

// ── Activate / Deactivate ──────────────────────────────────────

export async function setUserStatus(id, status, actorId) {
  const user = await prisma.user.update({
    where: { id },
    data: { status },
    ...userWithRelations(),
  });

  const action = status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
  await createAuditLog({
    actorId,
    action,
    entityType: 'User',
    entityId: user.id,
    organizationId: user.organizationId,
    metadata: { status },
  });

  return safeUser(user);
}

// ── Role assignment ────────────────────────────────────────────

export async function assignRoles(userId, roleIds, actorId) {
  // Remove all existing roles, then assign new set
  await prisma.userRole.deleteMany({ where: { userId } });

  if (roleIds?.length) {
    await prisma.userRole.createMany({
      data: roleIds.map(roleId => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, ...userWithRelations() });

  await createAuditLog({
    actorId,
    action: 'ROLE_ASSIGNED',
    entityType: 'User',
    entityId: userId,
    organizationId: user?.organizationId,
    metadata: { roleIds },
  });

  return safeUser(user);
}

// ── Organization assignment ────────────────────────────────────

export async function assignOrganization(userId, organizationId, organizationalUnitId, actorId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      organizationId:       organizationId       || null,
      organizationalUnitId: organizationalUnitId || null,
    },
    ...userWithRelations(),
  });

  await createAuditLog({
    actorId,
    action: 'ORGANIZATION_ASSIGNED',
    entityType: 'User',
    entityId: userId,
    organizationId,
    metadata: { organizationId, organizationalUnitId },
  });

  return safeUser(user);
}
