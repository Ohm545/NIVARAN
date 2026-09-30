/**
 * NIVARAN — Organization & Role Routes
 *
 * GET    /api/organizations
 * GET    /api/organizations/:id
 * POST   /api/organizations
 * PUT    /api/organizations/:id
 * GET    /api/organizations/:organizationId/units
 * POST   /api/organizations/:organizationId/units
 * PUT    /api/organizations/:organizationId/units/:unitId
 * GET    /api/roles
 */

import { Router } from 'express';
import {
  listOrganizations, getOrganization, createOrganization, updateOrganization,
  listUnits, createUnit, updateUnit, listRoles,
} from '../controllers/organization.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import {
  createOrganizationRules, updateOrganizationRules, createUnitRules, validateRequest,
} from '../validators/organization.validator.js';

const router = Router();

router.use(authenticate);

// Organizations
router.get('/',    requirePermission('ORGANIZATION_VIEW'),   listOrganizations);
router.get('/:id', requirePermission('ORGANIZATION_VIEW'),   getOrganization);
router.post('/',   requirePermission('ORGANIZATION_CREATE'), createOrganizationRules, validateRequest, createOrganization);
router.put('/:id', requirePermission('ORGANIZATION_UPDATE'), updateOrganizationRules, validateRequest, updateOrganization);

// Units nested under organizations
router.get('/:organizationId/units',              requirePermission('ORGANIZATION_VIEW'),   listUnits);
router.post('/:organizationId/units',             requirePermission('ORGANIZATION_CREATE'), createUnitRules, validateRequest, createUnit);
router.put('/:organizationId/units/:unitId',      requirePermission('ORGANIZATION_UPDATE'), updateOrganizationRules, validateRequest, updateUnit);

export default router;
