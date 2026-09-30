/**
 * NIVARAN — Approval Routes (Module 4)
 *
 * GET  /api/approvals                          — approval queue
 * GET  /api/government-needs/:id/review-history — full review trail
 * POST /api/government-needs/:id/approve
 * POST /api/government-needs/:id/reject
 * POST /api/government-needs/:id/send-back
 * POST /api/government-needs/:id/resubmit
 */

import { Router } from 'express';
import {
  listApprovals,
  approveNeed, rejectNeed, sendBackNeed, resubmitNeed,
  getReviewHistory,
} from '../controllers/approval.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import {
  approveRules, rejectRules, sendBackRules,
  listApprovalsQueryRules, validateRequest,
} from '../validators/approval.validator.js';

const router = Router();
router.use(authenticate);

// ── Approval queue (Approving Authority) ──────────────────────
router.get('/', listApprovalsQueryRules, validateRequest, requirePermission('APPROVAL_VIEW'), listApprovals);

export default router;

// ── Need-scoped workflow routes — exported for mounting on /government-needs ──
export const needWorkflowRouter = Router();
needWorkflowRouter.use(authenticate);

needWorkflowRouter.get('/:id/review-history',
  requirePermission('PROBLEM_VIEW'),
  getReviewHistory
);

needWorkflowRouter.post('/:id/approve',
  approveRules, validateRequest,
  requirePermission('APPROVAL_APPROVE'),
  approveNeed
);

needWorkflowRouter.post('/:id/reject',
  rejectRules, validateRequest,
  requirePermission('APPROVAL_REJECT'),
  rejectNeed
);

needWorkflowRouter.post('/:id/send-back',
  sendBackRules, validateRequest,
  requirePermission('APPROVAL_SEND_BACK'),
  sendBackNeed
);

needWorkflowRouter.post('/:id/resubmit',
  requirePermission('PROBLEM_SUBMIT'),
  resubmitNeed
);
