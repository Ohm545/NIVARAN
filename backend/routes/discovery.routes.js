/**
 * NIVARAN — Discovery Routes (Module 5)
 *
 * Mounted under /api:
 *   GET    /api/government-needs/:needId/discovery-criteria
 *   PUT    /api/government-needs/:needId/discovery-criteria
 *   GET    /api/government-needs/:needId/discovery-runs
 *   POST   /api/government-needs/:needId/discovery-runs
 *   GET    /api/discovery-runs/:runId
 *   GET    /api/discovery-runs/:runId/candidates
 *   GET    /api/discovery-candidates/:id
 *   POST   /api/discovery-candidates/:id/under-review
 *   POST   /api/discovery-candidates/:id/shortlist
 *   POST   /api/discovery-candidates/:id/not-relevant
 *   GET    /api/solutions
 */

import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import {
  getCriteria, updateCriteria,
  listRuns, startRun,
  getRun, getRunCandidates,
  getCandidate, markUnderReview, shortlistCandidate, markNotRelevant,
  listSolutions,
} from '../controllers/discovery.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, error: { message: 'Validation failed.', fields: errors.array().map(e => ({ field: e.path, message: e.msg })) } });
  }
  next();
}

// ── Need-scoped discovery routes ──────────────────────────────
export const needDiscoveryRouter = Router();
needDiscoveryRouter.use(authenticate);

needDiscoveryRouter.get('/:needId/discovery-criteria',
  requirePermission('SOLUTION_DISCOVERY_VIEW'), getCriteria);

needDiscoveryRouter.put('/:needId/discovery-criteria',
  requirePermission('SOLUTION_DISCOVERY_CREATE'), updateCriteria);

needDiscoveryRouter.get('/:needId/discovery-runs',
  requirePermission('SOLUTION_DISCOVERY_VIEW'), listRuns);

needDiscoveryRouter.post('/:needId/discovery-runs',
  requirePermission('SOLUTION_DISCOVERY_CREATE'), startRun);

// ── Discovery Run routes ──────────────────────────────────────
export const discoveryRunRouter = Router();
discoveryRunRouter.use(authenticate);

discoveryRunRouter.get('/:runId',
  requirePermission('SOLUTION_DISCOVERY_VIEW'), getRun);

discoveryRunRouter.get('/:runId/candidates',
  [query('matchStatus').optional().isIn(['DISCOVERED','UNDER_REVIEW','SHORTLISTED','NOT_RELEVANT']), validate],
  requirePermission('SOLUTION_DISCOVERY_VIEW'), getRunCandidates);

// ── Discovery Candidate routes ────────────────────────────────
export const discoveryCandidateRouter = Router();
discoveryCandidateRouter.use(authenticate);

discoveryCandidateRouter.get('/:id',
  requirePermission('SOLUTION_DISCOVERY_VIEW'), getCandidate);

discoveryCandidateRouter.post('/:id/under-review',
  [body('note').optional().isLength({ max: 1000 }), validate],
  requirePermission('SOLUTION_DISCOVERY_REVIEW'), markUnderReview);

discoveryCandidateRouter.post('/:id/shortlist',
  [body('note').optional().isLength({ max: 1000 }), validate],
  requirePermission('SOLUTION_DISCOVERY_REVIEW'), shortlistCandidate);

discoveryCandidateRouter.post('/:id/not-relevant',
  [body('reason').notEmpty().withMessage('Reason is required.').isLength({ min: 5, max: 1000 }), validate],
  requirePermission('SOLUTION_DISCOVERY_REVIEW'), markNotRelevant);

// ── Solutions catalog ─────────────────────────────────────────
export const solutionsRouter = Router();
solutionsRouter.use(authenticate);
solutionsRouter.get('/', requirePermission('SOLUTION_VIEW'), listSolutions);
