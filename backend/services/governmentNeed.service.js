/**
 * NIVARAN — Government Need Service (Module 2)
 *
 * Handles all CRUD operations for GovernmentNeed.
 * Original user-entered content is NEVER overwritten.
 * AI fields will be added as separate columns in Module 3.
 */

import prisma from '../config/database.js';
import { createAuditLog } from './audit.service.js';

// ── Projection ─────────────────────────────────────────────────

const includeRelations = {
  include: {
    createdBy:          { select: { id: true, name: true, email: true } },
    organization:       { select: { id: true, name: true, code: true } },
    organizationalUnit: { select: { id: true, name: true, code: true } },
    reviewHistory: {
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true, email: true } } },
    },
  },
};

// ── Authorization helpers ───────────────────────────────────────

/**
 * Checks that the given need exists and the requesting user is scoped to it.
 * SYSTEM_ADMIN bypasses scope check.
 */
async function assertAccess(needId, userId, userRoles, userOrgId) {
  const need = await prisma.governmentNeed.findUnique({
    where: { id: needId },
    select: {
      id: true, status: true, createdById: true,
      organizationId: true, organizationalUnitId: true,
    },
  });

  if (!need) {
    throw Object.assign(new Error('Government need not found.'), { status: 404 });
  }

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && need.organizationId !== userOrgId) {
    throw Object.assign(new Error('Access denied: outside your organizational scope.'), { status: 403 });
  }

  return need;
}

// ── List ────────────────────────────────────────────────────────

export async function listNeeds({ userId, userRoles, userOrgId, page = 1, limit = 20, status, domain } = {}) {
  const skip  = (page - 1) * limit;
  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');

  const where = {
    ...(isSysAdmin ? {} : { organizationId: userOrgId }),
    ...(status ? { status } : {}),
    ...(domain ? { domain: { contains: domain, mode: 'insensitive' } } : {}),
  };

  const [needs, total] = await Promise.all([
    prisma.governmentNeed.findMany({
      where,
      skip,
      take:     limit,
      orderBy:  { createdAt: 'desc' },
      ...includeRelations,
    }),
    prisma.governmentNeed.count({ where }),
  ]);

  return {
    needs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Get single ─────────────────────────────────────────────────

export async function getNeedById(needId, userId, userRoles, userOrgId) {
  await assertAccess(needId, userId, userRoles, userOrgId);

  return prisma.governmentNeed.findUnique({
    where: { id: needId },
    ...includeRelations,
  });
}

// ── Create ─────────────────────────────────────────────────────

export async function createNeed(data, userId, userOrgId, userUnitId) {
  const need = await prisma.governmentNeed.create({
    data: {
      title:                data.title?.trim(),
      status:               'DRAFT',
      problemStatement:     data.problemStatement?.trim() ?? '',
      currentSituation:     data.currentSituation?.trim()   || null,
      existingProcess:      data.existingProcess?.trim()     || null,
      desiredOutcome:       data.desiredOutcome?.trim() ?? '',
      successCriteria:      data.successCriteria?.trim()     || null,
      domain:               data.domain?.trim() ?? '',
      subDomain:            data.subDomain?.trim()           || null,
      geographicScope:      data.geographicScope?.trim()     || null,
      operationalScope:     data.operationalScope?.trim()    || null,
      affectedPopulation:   data.affectedPopulation?.trim()  || null,
      affectedPopulationEstimate: data.affectedPopulationEstimate ? BigInt(data.affectedPopulationEstimate) : null,
      expectedStartDate:    data.expectedStartDate  ? new Date(data.expectedStartDate)  : null,
      expectedTargetDate:   data.expectedTargetDate ? new Date(data.expectedTargetDate) : null,
      urgency:              data.urgency             || null,
      constraints:          data.constraints?.trim()         || null,
      baselineInformation:  data.baselineInformation?.trim() || null,
      initialKPIs:          data.initialKPIs ?? null,
      additionalContext:    data.additionalContext?.trim()   || null,
      createdById:          userId,
      organizationId:       userOrgId,
      organizationalUnitId: userUnitId || null,
    },
    ...includeRelations,
  });

  await createAuditLog({
    actorId:        userId,
    action:         'GOVERNMENT_NEED_CREATED',
    entityType:     'GovernmentNeed',
    entityId:       need.id,
    organizationId: need.organizationId,
    metadata:       { title: need.title, status: need.status },
  });

  return need;
}

// ── Update (DRAFT only) ─────────────────────────────────────────

export async function updateNeed(needId, data, userId, userRoles, userOrgId) {
  const existing = await assertAccess(needId, userId, userRoles, userOrgId);

  // Allow editing DRAFT and SENT_BACK — no other status
  if (existing.status !== 'DRAFT' && existing.status !== 'SENT_BACK') {
    throw Object.assign(new Error('Only DRAFT or SENT_BACK government needs can be edited.'), { status: 409 });
  }

  // Only the creator or SYSTEM_ADMIN can edit
  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && existing.createdById !== userId) {
    throw Object.assign(new Error('You can only edit your own government needs.'), { status: 403 });
  }

  const updated = await prisma.governmentNeed.update({
    where: { id: needId },
    data:  buildUpdateData(data),
    ...includeRelations,
  });

  await createAuditLog({
    actorId:        userId,
    action:         'GOVERNMENT_NEED_UPDATED',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: updated.organizationId,
    metadata:       { fields: Object.keys(data) },
  });

  return updated;
}

function buildUpdateData(data) {
  const u = {};
  const str  = (v) => v !== undefined ? (v?.trim() || null) : undefined;
  const date = (v) => v !== undefined ? (v ? new Date(v) : null) : undefined;

  if (data.title                !== undefined) u.title                = data.title.trim();
  if (data.problemStatement     !== undefined) u.problemStatement     = data.problemStatement.trim();
  if (data.currentSituation     !== undefined) u.currentSituation     = str(data.currentSituation);
  if (data.existingProcess      !== undefined) u.existingProcess      = str(data.existingProcess);
  if (data.desiredOutcome       !== undefined) u.desiredOutcome       = data.desiredOutcome.trim();
  if (data.successCriteria      !== undefined) u.successCriteria      = str(data.successCriteria);
  if (data.domain               !== undefined) u.domain               = data.domain.trim();
  if (data.subDomain            !== undefined) u.subDomain            = str(data.subDomain);
  if (data.geographicScope      !== undefined) u.geographicScope      = str(data.geographicScope);
  if (data.operationalScope     !== undefined) u.operationalScope     = str(data.operationalScope);
  if (data.affectedPopulation   !== undefined) u.affectedPopulation   = str(data.affectedPopulation);
  if (data.affectedPopulationEstimate !== undefined) {
    u.affectedPopulationEstimate = data.affectedPopulationEstimate ? BigInt(data.affectedPopulationEstimate) : null;
  }
  if (data.expectedStartDate    !== undefined) u.expectedStartDate    = date(data.expectedStartDate);
  if (data.expectedTargetDate   !== undefined) u.expectedTargetDate   = date(data.expectedTargetDate);
  if (data.urgency              !== undefined) u.urgency              = data.urgency || null;
  if (data.constraints          !== undefined) u.constraints          = str(data.constraints);
  if (data.baselineInformation  !== undefined) u.baselineInformation  = str(data.baselineInformation);
  if (data.initialKPIs          !== undefined) u.initialKPIs          = data.initialKPIs ?? null;
  if (data.additionalContext    !== undefined) u.additionalContext    = str(data.additionalContext);

  return u;
}

// ── Submit ─────────────────────────────────────────────────────

export async function submitNeed(needId, userId, userRoles, userOrgId) {
  const existing = await assertAccess(needId, userId, userRoles, userOrgId);

  if (existing.status !== 'DRAFT') {
    throw Object.assign(new Error('Only DRAFT government needs can be submitted. Use resubmit for SENT_BACK needs.'), { status: 409 });
  }

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && existing.createdById !== userId) {
    throw Object.assign(new Error('You can only submit your own government needs.'), { status: 403 });
  }

  // Re-fetch full record to validate required fields
  const full = await prisma.governmentNeed.findUnique({ where: { id: needId } });

  const missing = [];
  if (!full.title?.trim())            missing.push('title');
  if (!full.problemStatement?.trim()) missing.push('problemStatement');
  if (!full.desiredOutcome?.trim())   missing.push('desiredOutcome');
  if (!full.domain?.trim())           missing.push('domain');

  if (missing.length) {
    throw Object.assign(
      new Error(`Required fields missing for submission: ${missing.join(', ')}.`),
      { status: 422, fields: missing }
    );
  }

  const submitted = await prisma.governmentNeed.update({
    where: { id: needId },
    data:  { status: 'SUBMITTED', submittedAt: new Date() },
    ...includeRelations,
  });

  await createAuditLog({
    actorId:        userId,
    action:         'GOVERNMENT_NEED_SUBMITTED',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: submitted.organizationId,
    metadata:       { title: submitted.title },
  });

  return submitted;
}

// ── Delete (DRAFT only) ─────────────────────────────────────────

export async function deleteNeed(needId, userId, userRoles, userOrgId) {
  const existing = await assertAccess(needId, userId, userRoles, userOrgId);

  if (existing.status !== 'DRAFT') {
    throw Object.assign(new Error('Only DRAFT government needs can be deleted.'), { status: 409 });
  }

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && existing.createdById !== userId) {
    throw Object.assign(new Error('You can only delete your own government needs.'), { status: 403 });
  }

  await prisma.governmentNeed.delete({ where: { id: needId } });

  await createAuditLog({
    actorId:        userId,
    action:         'GOVERNMENT_NEED_DELETED',
    entityType:     'GovernmentNeed',
    entityId:       needId,
    organizationId: userOrgId,
    metadata:       { title: existing.title ?? needId },
  });
}
