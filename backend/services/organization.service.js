/**
 * NIVARAN — Organization Service
 */

import prisma from '../config/database.js';

// ── Organizations ──────────────────────────────────────────────

export async function listOrganizations() {
  return prisma.organization.findMany({
    orderBy: { name: 'asc' },
    include: { units: { orderBy: { name: 'asc' } } },
  });
}

export async function getOrganizationById(id) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { units: { orderBy: { name: 'asc' } } },
  });
  if (!org) throw Object.assign(new Error('Organization not found.'), { status: 404 });
  return org;
}

export async function createOrganization(data) {
  const { name, code, description } = data;

  const existing = await prisma.organization.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (existing) throw Object.assign(new Error('An organization with this code already exists.'), { status: 409 });

  return prisma.organization.create({
    data: { name, code: code.toUpperCase().trim(), description },
  });
}

export async function updateOrganization(id, data) {
  const { name, description, isActive } = data;
  return prisma.organization.update({
    where: { id },
    data: {
      ...(name        !== undefined ? { name }        : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive    !== undefined ? { isActive }    : {}),
    },
  });
}

// ── Organizational Units ───────────────────────────────────────

export async function listUnits(organizationId) {
  return prisma.organizationalUnit.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
}

export async function createUnit(organizationId, data) {
  const { name, code, description } = data;

  const existing = await prisma.organizationalUnit.findUnique({
    where: { organizationId_code: { organizationId, code: code.toUpperCase().trim() } },
  });
  if (existing) throw Object.assign(new Error('A unit with this code already exists in this organization.'), { status: 409 });

  return prisma.organizationalUnit.create({
    data: { name, code: code.toUpperCase().trim(), organizationId, description },
  });
}

export async function updateUnit(id, data) {
  const { name, description, isActive } = data;
  return prisma.organizationalUnit.update({
    where: { id },
    data: {
      ...(name        !== undefined ? { name }        : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive    !== undefined ? { isActive }    : {}),
    },
  });
}

// ── Role list (for admin dropdowns) ───────────────────────────

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { displayName: 'asc' },
    include: {
      rolePermissions: { include: { permission: { select: { id: true, name: true, displayName: true, module: true, isActive: true } } } },
    },
  });
}
