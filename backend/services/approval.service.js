/**
 * NIVARAN — Approval Service (Module 4)
 *
 * Handles all review/approval workflow transitions for GovernmentNeed.
 *
 * Allowed transitions:
 *   SUBMITTED  → APPROVED     (APPROVING_AUTHORITY)
 *   SUBMITTED  → REJECTED     (APPROVING_AUTHORITY)
 *   SUBMITTED  → SENT_BACK    (APPROVING_AUTHORITY)
 *   SENT_BACK  → SUBMITTED    (PROBLEM_OWNER resubmit)
 *
 * ALL other transitions are blocked.
 * Status is NEVER changed directly by PUT on GovernmentNeed.
 */

import prisma         from '../config/database.js';
import { createAuditLog } from './audit.service.js';

// ── Shared: scope check ─────────────────────────────────────────────────────

async function assertNeedInScope(needId, userRoles, userOrgId) {
  const need = await prisma.governmentNeed.findUnique({
    where:  { id: needId },
    select: { id: true, status: true, createdById: true, organizationId: true, title: true },
  });

  if (!need) throw Object.assign(new Error('Government need not found.'), { status: 404 });

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && need.organizationId !== userOrgId) {
    throw Object.assign(new Error('Access denied: outside your organizational scope.'), { status: 403 });
  }

  return need;
}

// ── Shared: create review history row ──────────────────────────────────────

async function recordReview(tx, { governmentNeedId, actorId, action, comment, fromStatus, toStatus }) {
  return tx.governmentNeedReview.create({
    data: { governmentNeedId, actorId, action, comment: comment ?? null, fromStatus, toStatus },
  });
}

// ── APPROVE ────────────────────────────────────────────────────────────────

export async function approveNeed(needId, actorId, userRoles, userOrgId, comment) {
  const need = await assertNeedInScope(needId, userRoles, userOrgId);

  if (need.status !== 'SUBMITTED') {
    throw Object.assign(
      new Error(`Cannot approve: Government need is currently ${need.status}. Only SUBMITTED needs can be approved.`),
      { status: 409 }
    );
  }

  // Self-approval prevention — enforced server-side
  if (need.createdById === actorId) {
    throw Object.assign(
      new Error('Self-approval is not permitted. You cannot approve a Government Need you created.'),
      { status: 403 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.governmentNeed.update({
      where: { id: needId },
      data:  { status: 'APPROVED' },
    });

    await recordReview(tx, {
      governmentNeedId: needId,
      actorId,
      action:     'APPROVED',
      comment:    comment?.trim() || null,
      fromStatus: 'SUBMITTED',
      toStatus:   'APPROVED',
    });

    return updated;
  });

  await createAuditLog({
    actorId,
    action:         'GOVERNMENT_NEED_APPROVED',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: need.organizationId,
    metadata:       { title: need.title, comment: comment?.trim() || null },
  });

  return result;
}

// ── REJECT ─────────────────────────────────────────────────────────────────

export async function rejectNeed(needId, actorId, userRoles, userOrgId, reason) {
  if (!reason?.trim()) {
    throw Object.assign(new Error('A rejection reason is required.'), { status: 400 });
  }

  const need = await assertNeedInScope(needId, userRoles, userOrgId);

  if (need.status !== 'SUBMITTED') {
    throw Object.assign(
      new Error(`Cannot reject: Government need is currently ${need.status}. Only SUBMITTED needs can be rejected.`),
      { status: 409 }
    );
  }

  if (need.createdById === actorId) {
    throw Object.assign(new Error('Self-rejection is not permitted.'), { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.governmentNeed.update({
      where: { id: needId },
      data:  { status: 'REJECTED' },
    });

    await recordReview(tx, {
      governmentNeedId: needId,
      actorId,
      action:     'REJECTED',
      comment:    reason.trim(),
      fromStatus: 'SUBMITTED',
      toStatus:   'REJECTED',
    });

    return updated;
  });

  await createAuditLog({
    actorId,
    action:         'GOVERNMENT_NEED_REJECTED',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: need.organizationId,
    metadata:       { title: need.title, reason: reason.trim() },
  });

  return result;
}

// ── SEND BACK ──────────────────────────────────────────────────────────────

export async function sendBackNeed(needId, actorId, userRoles, userOrgId, reason) {
  if (!reason?.trim()) {
    throw Object.assign(new Error('A send-back reason is required.'), { status: 400 });
  }

  const need = await assertNeedInScope(needId, userRoles, userOrgId);

  if (need.status !== 'SUBMITTED') {
    throw Object.assign(
      new Error(`Cannot send back: Government need is currently ${need.status}. Only SUBMITTED needs can be sent back.`),
      { status: 409 }
    );
  }

  if (need.createdById === actorId) {
    throw Object.assign(new Error('You cannot send back your own Government Need.'), { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.governmentNeed.update({
      where: { id: needId },
      data:  { status: 'SENT_BACK' },
    });

    await recordReview(tx, {
      governmentNeedId: needId,
      actorId,
      action:     'SENT_BACK',
      comment:    reason.trim(),
      fromStatus: 'SUBMITTED',
      toStatus:   'SENT_BACK',
    });

    return updated;
  });

  await createAuditLog({
    actorId,
    action:         'GOVERNMENT_NEED_SENT_BACK',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: need.organizationId,
    metadata:       { title: need.title, reason: reason.trim() },
  });

  return result;
}

// ── RESUBMIT (SENT_BACK → SUBMITTED) ──────────────────────────────────────

export async function resubmitNeed(needId, actorId, userRoles, userOrgId) {
  const need = await assertNeedInScope(needId, userRoles, userOrgId);

  if (need.status !== 'SENT_BACK') {
    throw Object.assign(
      new Error(`Cannot resubmit: Government need is currently ${need.status}. Only SENT_BACK needs can be resubmitted.`),
      { status: 409 }
    );
  }

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && need.createdById !== actorId) {
    throw Object.assign(new Error('You can only resubmit your own Government Need.'), { status: 403 });
  }

  // Validate required fields before resubmission
  const full = await prisma.governmentNeed.findUnique({ where: { id: needId } });
  const missing = [];
  if (!full.title?.trim())            missing.push('title');
  if (!full.problemStatement?.trim()) missing.push('problemStatement');
  if (!full.desiredOutcome?.trim())   missing.push('desiredOutcome');
  if (!full.domain?.trim())           missing.push('domain');

  if (missing.length) {
    throw Object.assign(
      new Error(`Required fields missing: ${missing.join(', ')}.`),
      { status: 422 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.governmentNeed.update({
      where: { id: needId },
      data:  { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await recordReview(tx, {
      governmentNeedId: needId,
      actorId,
      action:     'RESUBMITTED',
      comment:    null,
      fromStatus: 'SENT_BACK',
      toStatus:   'SUBMITTED',
    });

    return updated;
  });

  await createAuditLog({
    actorId,
    action:         'GOVERNMENT_NEED_RESUBMITTED',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: need.organizationId,
    metadata:       { title: need.title },
  });

  return result;
}

// ── LIST PENDING (approval queue) ─────────────────────────────────────────

export async function listPendingApprovals({ userRoles, userOrgId, page = 1, limit = 20 } = {}) {
  const skip       = (page - 1) * limit;
  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');

  const where = {
    status: { in: ['SUBMITTED'] },
    ...(isSysAdmin ? {} : { organizationId: userOrgId }),
  };

  const [needs, total] = await Promise.all([
    prisma.governmentNeed.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { submittedAt: 'asc' },
      include: {
        createdBy:          { select: { id: true, name: true, email: true } },
        organization:       { select: { id: true, name: true, code: true } },
        organizationalUnit: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.governmentNeed.count({ where }),
  ]);

  return { needs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// ── LIST ALL FOR AUTHORITY (submitted + recently decided) ──────────────────

export async function listAllForAuthority({ userRoles, userOrgId, status, page = 1, limit = 20 } = {}) {
  const skip       = (page - 1) * limit;
  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');

  // Approving Authority sees all except pure drafts
  const allowedStatuses = status
    ? [status]
    : ['SUBMITTED', 'APPROVED', 'REJECTED', 'SENT_BACK'];

  const where = {
    status: { in: allowedStatuses },
    ...(isSysAdmin ? {} : { organizationId: userOrgId }),
  };

  const [needs, total] = await Promise.all([
    prisma.governmentNeed.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy:          { select: { id: true, name: true, email: true } },
        organization:       { select: { id: true, name: true, code: true } },
        organizationalUnit: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.governmentNeed.count({ where }),
  ]);

  return { needs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// ── REVIEW HISTORY ─────────────────────────────────────────────────────────

export async function getReviewHistory(needId, userRoles, userOrgId) {
  await assertNeedInScope(needId, userRoles, userOrgId);

  return prisma.governmentNeedReview.findMany({
    where:   { governmentNeedId: needId },
    orderBy: { createdAt: 'asc' },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
}
