/**
 * NIVARAN — User Routes
 *
 * All routes require SYSTEM_ADMIN permission via requirePermission().
 *
 * GET    /api/users
 * GET    /api/users/:id
 * POST   /api/users
 * PUT    /api/users/:id
 * PATCH  /api/users/:id/activate
 * PATCH  /api/users/:id/deactivate
 * PUT    /api/users/:id/roles
 * PUT    /api/users/:id/organization
 */

import { Router } from 'express';
import {
  listUsers, getUser, createUser, updateUser,
  activateUser, deactivateUser, assignRoles, assignOrganization,
} from '../controllers/user.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import {
  createUserRules, updateUserRules, assignRolesRules, validateRequest,
} from '../validators/user.validator.js';

const router = Router();

// All user admin routes require authentication
router.use(authenticate);

router.get('/',    requirePermission('USER_VIEW'),       listUsers);
router.get('/:id', requirePermission('USER_VIEW'),       getUser);
router.post('/',   requirePermission('USER_CREATE'),     createUserRules, validateRequest, createUser);
router.put('/:id', requirePermission('USER_UPDATE'),     updateUserRules, validateRequest, updateUser);

router.patch('/:id/activate',    requirePermission('USER_DEACTIVATE'), activateUser);
router.patch('/:id/deactivate',  requirePermission('USER_DEACTIVATE'), deactivateUser);

router.put('/:id/roles',         requirePermission('ROLE_ASSIGN'),         assignRolesRules, validateRequest, assignRoles);
router.put('/:id/organization',  requirePermission('USER_UPDATE'),         assignOrganization);

export default router;
