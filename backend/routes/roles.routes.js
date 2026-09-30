/**
 * NIVARAN — Roles Routes
 * GET /api/roles
 */

import { Router } from 'express';
import { listRoles } from '../controllers/organization.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('ROLE_VIEW'), listRoles);

export default router;
