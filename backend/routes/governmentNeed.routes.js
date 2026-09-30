/**
 * NIVARAN — Government Need Routes (Module 2)
 *
 * GET    /api/government-needs
 * POST   /api/government-needs
 * GET    /api/government-needs/:id
 * PUT    /api/government-needs/:id
 * POST   /api/government-needs/:id/submit
 * DELETE /api/government-needs/:id
 */

import { Router } from 'express';
import {
  listNeeds, getNeed, createNeed, updateNeed, submitNeed, deleteNeed,
} from '../controllers/governmentNeed.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import {
  createNeedRules, updateNeedRules, listNeedsQueryRules, validateRequest,
} from '../validators/governmentNeed.validator.js';

const router = Router();

router.use(authenticate);

router.get('/',    listNeedsQueryRules, validateRequest, requirePermission('PROBLEM_VIEW'),   listNeeds);
router.post('/',   createNeedRules,     validateRequest, requirePermission('PROBLEM_CREATE'), createNeed);
router.get('/:id',                                       requirePermission('PROBLEM_VIEW'),   getNeed);
router.put('/:id', updateNeedRules,     validateRequest, requirePermission('PROBLEM_EDIT'),   updateNeed);
router.post('/:id/submit',                               requirePermission('PROBLEM_SUBMIT'), submitNeed);
router.delete('/:id',                                    requirePermission('PROBLEM_EDIT'),   deleteNeed);

export default router;
