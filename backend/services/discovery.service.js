/**
 * NIVARAN — Discovery Service (Module 5)
 *
 * Orchestrates discovery runs:
 *   1. Verify Government Need is APPROVED + in scope
 *   2. Load/create DiscoveryCriteria
 *   3. Create DiscoveryRun
 *   4. Query source adapters
 *   5. Deduplicate candidates
 *   6. Run AI relevance matching
 *   7. Persist DiscoveryCandidates
 *   8. Complete DiscoveryRun
 */

import prisma                from '../config/database.js';
import { createAuditLog }    from './audit.service.js';
import { search as manualSearch } from './sources/manualSource.adapter.js';
import { matchSolutionToNeed, PROMPT_VERSION } from '../ai/discoveryMatcher.js';
import { env }               from '../config/env.js';
import { logger }            from '../utils/logger.js';

// ── Scope helper ──────────────────────────────────────────────
async function assertApprovedInScope(needId, userRoles, userOrgId) {
  const need = await prisma.governmentNeed.findUnique({
    where:  { id: needId },
    select: { id: true, status: true, organizationId: true, title: true,
              problemStatement: true, desiredOutcome: true, domain: true,
              subDomain: true, constraints: true, geographicScope: true,
              affectedPopulation: true, currentSituation: true,
              existingProcess: true, successCriteria: true },
  });
  if (!need) throw Object.assign(new Error('Government need not found.'), { status: 404 });
  if (need.status !== 'APPROVED') {
    throw Object.assign(
      new Error(`Discovery is only available for APPROVED Government Needs. Current status: ${need.status}.`),
      { status: 409 }
    );
  }
  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && need.organizationId !== userOrgId) {
    throw Object.assign(new Error('Access denied: outside your organizational scope.'), { status: 403 });
  }
  return need;
}

// ── Get or create DiscoveryCriteria ───────────────────────────
export async function getOrCreateCriteria(needId, userRoles, userOrgId) {
  await assertApprovedInScope(needId, userRoles, userOrgId);

  const existing = await prisma.discoveryCriteria.findUnique({ where: { governmentNeedId: needId } });
  if (existing) return existing;

  // Bootstrap from Government Need fields
  const need = await prisma.governmentNeed.findUnique({
    where: { id: needId },
    select: { domain: true, subDomain: true, geographicScope: true, constraints: true },
  });

  return prisma.discoveryCriteria.create({
    data: {
      governmentNeedId: needId,
      domain:           need.domain || null,
      subDomain:        need.subDomain || null,
      geographicScope:  need.geographicScope || null,
      capabilities:     [],
      problemKeywords:  [],
      outcomeKeywords:  [],
      constraints:      [],
      targetUsers:      [],
      techPreferences:  [],
      techExclusions:   [],
    },
  });
}

export async function updateCriteria(needId, data, userRoles, userOrgId) {
  await assertApprovedInScope(needId, userRoles, userOrgId);

  const fields = [
    'capabilities','problemKeywords','outcomeKeywords','domain','subDomain',
    'geographicScope','operatingEnv','constraints','targetUsers',
    'techPreferences','techExclusions',
  ];
  const update = {};
  for (const f of fields) {
    if (data[f] !== undefined) update[f] = data[f];
  }

  return prisma.discoveryCriteria.upsert({
    where:  { governmentNeedId: needId },
    update,
    create: { governmentNeedId: needId, ...update },
  });
}

// ── Run Discovery ─────────────────────────────────────────────
export async function runDiscovery(needId, actorId, userRoles, userOrgId) {
  const need = await assertApprovedInScope(needId, userRoles, userOrgId);

  const criteria = await getOrCreateCriteria(needId, userRoles, userOrgId);

  // Create DiscoveryRun
  const run = await prisma.discoveryRun.create({
    data: {
      governmentNeedId: needId,
      initiatedById:    actorId,
      criteriaSnapshot: criteria,
      sourceTypes:      ['MANUAL_ENTRY'],
      status:           'RUNNING',
    },
  });

  await createAuditLog({
    actorId,
    action:         'DISCOVERY_RUN_CREATED',
    entityType:     'DiscoveryRun',
    entityId:       run.id,
    organizationId: need.organizationId,
    metadata:       { governmentNeedId: needId, title: need.title },
  });

  // Query sources
  let rawCandidates = [];
  try {
    rawCandidates = await manualSearch(criteria);
  } catch (err) {
    logger.error(`[Discovery] Source query failed: ${err.message}`);
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: err.message },
    });
    await createAuditLog({
      actorId, action: 'DISCOVERY_RUN_FAILED', entityType: 'DiscoveryRun',
      entityId: run.id, organizationId: need.organizationId,
      metadata: { error: err.message },
    });
    throw Object.assign(new Error('Discovery source query failed. Please try again.'), { status: 500 });
  }

  if (!rawCandidates.length) {
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return { run: await prisma.discoveryRun.findUnique({ where: { id: run.id } }), candidates: [] };
  }

  // Deduplicate by solutionId
  const seen = new Set();
  const deduped = rawCandidates.filter(c => {
    const key = c.solution.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Create candidates + AI match
  const created = [];
  for (const c of deduped) {
    try {
      // Check if candidate already exists for this run+need+solution
      const existing = await prisma.discoveryCandidate.findFirst({
        where: { governmentNeedId: needId, discoveryRunId: run.id, solutionId: c.solution.id },
      });
      if (existing) { created.push(existing); continue; }

      // AI matching
      let aiOutput = null;
      let aiError  = null;
      let aiGenerated = false;

      try {
        const result = await matchSolutionToNeed(need, c.solution, c.provider);
        aiOutput    = result.aiOutput;
        aiError     = result.error;
        aiGenerated = Boolean(aiOutput);

        if (aiGenerated) {
          await createAuditLog({
            actorId, action: 'AI_SOLUTION_MATCH_GENERATED',
            entityType: 'DiscoveryCandidate', entityId: null,
            organizationId: need.organizationId,
            metadata: { solutionId: c.solution.id, runId: run.id, score: aiOutput?.relevance?.score },
          });
        }
      } catch (aiErr) {
        aiError = aiErr.message;
        logger.warn(`[Discovery] AI match failed for ${c.solution.id}: ${aiErr.message}`);
      }

      const candidate = await prisma.discoveryCandidate.create({
        data: {
          governmentNeedId:  needId,
          discoveryRunId:    run.id,
          solutionId:        c.solution.id,
          matchStatus:       'DISCOVERED',
          aiRelevanceScore:  aiOutput?.relevance?.score  ?? null,
          aiRelevanceLevel:  aiOutput?.relevance?.level  ?? null,
          aiMatchExplanation: aiOutput ?? (aiError ? { error: aiError } : null),
          aiProvider:        aiGenerated ? 'azure-openai' : null,
          aiModel:           aiGenerated ? env.azure.deployment : null,
          aiPromptVersion:   aiGenerated ? PROMPT_VERSION : null,
          aiGeneratedAt:     aiGenerated ? new Date() : null,
          aiGenerated,
        },
        include: {
          solution:  { include: { provider: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      });
      created.push(candidate);
    } catch (err) {
      logger.error(`[Discovery] Failed to create candidate ${c.solution.id}: ${err.message}`);
    }
  }

  const completed = await prisma.discoveryRun.update({
    where: { id: run.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  await createAuditLog({
    actorId, action: 'DISCOVERY_RUN_COMPLETED', entityType: 'DiscoveryRun',
    entityId: run.id, organizationId: need.organizationId,
    metadata: { candidatesFound: created.length },
  });

  return { run: completed, candidates: created };
}

// ── List Discovery Runs ────────────────────────────────────────
export async function listDiscoveryRuns(needId, userRoles, userOrgId) {
  await assertApprovedInScope(needId, userRoles, userOrgId);
  return prisma.discoveryRun.findMany({
    where:   { governmentNeedId: needId },
    orderBy: { startedAt: 'desc' },
    include: {
      initiatedBy: { select: { id: true, name: true, email: true } },
      _count:      { select: { candidates: true } },
    },
  });
}

// ── Get Run with Candidates ────────────────────────────────────
export async function getDiscoveryRun(runId, userRoles, userOrgId) {
  const run = await prisma.discoveryRun.findUnique({
    where:   { id: runId },
    include: {
      initiatedBy:  { select: { id: true, name: true } },
      governmentNeed: { select: { id: true, title: true, organizationId: true, status: true } },
    },
  });
  if (!run) throw Object.assign(new Error('Discovery run not found.'), { status: 404 });

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && run.governmentNeed.organizationId !== userOrgId) {
    throw Object.assign(new Error('Access denied.'), { status: 403 });
  }
  return run;
}

// ── Get Candidates for a Run ───────────────────────────────────
export async function getRunCandidates(runId, userRoles, userOrgId, filters = {}) {
  const run = await getDiscoveryRun(runId, userRoles, userOrgId);

  const where = {
    discoveryRunId: runId,
    ...(filters.matchStatus ? { matchStatus: filters.matchStatus } : {}),
  };

  return prisma.discoveryCandidate.findMany({
    where,
    orderBy: [{ aiRelevanceScore: 'desc' }, { createdAt: 'asc' }],
    include: {
      solution:   { include: { provider: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });
}

// ── Get Single Candidate ───────────────────────────────────────
export async function getCandidate(candidateId, userRoles, userOrgId) {
  const c = await prisma.discoveryCandidate.findUnique({
    where:   { id: candidateId },
    include: {
      solution:      { include: { provider: true } },
      governmentNeed:{ select: { id: true, title: true, organizationId: true } },
      reviewedBy:    { select: { id: true, name: true } },
    },
  });
  if (!c) throw Object.assign(new Error('Discovery candidate not found.'), { status: 404 });

  const isSysAdmin = (userRoles ?? []).includes('SYSTEM_ADMIN');
  if (!isSysAdmin && c.governmentNeed.organizationId !== userOrgId) {
    throw Object.assign(new Error('Access denied.'), { status: 403 });
  }
  return c;
}

// ── Human Review Actions ───────────────────────────────────────

async function updateCandidateStatus(candidateId, status, actorId, userRoles, userOrgId, { note, reason } = {}) {
  const c = await getCandidate(candidateId, userRoles, userOrgId);

  const updated = await prisma.discoveryCandidate.update({
    where: { id: candidateId },
    data: {
      matchStatus:         status,
      humanReviewed:       true,
      reviewedById:        actorId,
      reviewedAt:          new Date(),
      reviewNote:          note   ?? c.reviewNote,
      notRelevantReason:   reason ?? c.notRelevantReason,
    },
    include: { solution: { include: { provider: true } }, reviewedBy: { select: { id: true, name: true } } },
  });

  const actionMap = {
    UNDER_REVIEW: 'DISCOVERY_CANDIDATE_REVIEWED',
    SHORTLISTED:  'DISCOVERY_CANDIDATE_SHORTLISTED',
    NOT_RELEVANT: 'DISCOVERY_CANDIDATE_MARKED_NOT_RELEVANT',
  };

  await createAuditLog({
    actorId, action: actionMap[status] ?? 'DISCOVERY_CANDIDATE_REVIEWED',
    entityType: 'DiscoveryCandidate', entityId: candidateId,
    organizationId: c.governmentNeed.organizationId,
    metadata: { status, solutionId: c.solutionId, note, reason },
  });

  return updated;
}

export async function markUnderReview(id, actorId, userRoles, userOrgId, note) {
  return updateCandidateStatus(id, 'UNDER_REVIEW', actorId, userRoles, userOrgId, { note });
}

export async function shortlistCandidate(id, actorId, userRoles, userOrgId, note) {
  return updateCandidateStatus(id, 'SHORTLISTED', actorId, userRoles, userOrgId, { note });
}

export async function markNotRelevant(id, actorId, userRoles, userOrgId, reason) {
  if (!reason?.trim()) throw Object.assign(new Error('A reason is required when marking a candidate as not relevant.'), { status: 400 });
  return updateCandidateStatus(id, 'NOT_RELEVANT', actorId, userRoles, userOrgId, { reason: reason.trim() });
}

// ── List all solutions (admin/catalog browse) ──────────────────
export async function listSolutions({ page = 1, limit = 20, domain, providerType, search } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    isActive: true,
    provider: { isActive: true },
    ...(domain ? { domains: { array_contains: domain } } : {}),
    ...(search ? {
      OR: [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { provider: { organizationName: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [solutions, total] = await Promise.all([
    prisma.solution.findMany({ where, skip, take: limit, include: { provider: true }, orderBy: { createdAt: 'desc' } }),
    prisma.solution.count({ where }),
  ]);

  return { solutions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
