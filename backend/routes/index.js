import { Router } from 'express';
import authRoutes              from './auth.routes.js';
import userRoutes              from './user.routes.js';
import organizationRoutes      from './organization.routes.js';
import rolesRoutes             from './roles.routes.js';
import governmentNeedRoutes    from './governmentNeed.routes.js';
import approvalRoutes, { needWorkflowRouter } from './approval.routes.js';
import {
  needDiscoveryRouter, discoveryRunRouter,
  discoveryCandidateRouter, solutionsRouter,
} from './discovery.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'NIVARAN API is running.', version: '1.0.0' });
});

router.use('/auth',                  authRoutes);
router.use('/users',                 userRoutes);
router.use('/organizations',         organizationRoutes);
router.use('/roles',                 rolesRoutes);
router.use('/government-needs',      governmentNeedRoutes);
router.use('/government-needs',      needWorkflowRouter);      // Module 4
router.use('/government-needs',      needDiscoveryRouter);     // Module 5
router.use('/approvals',             approvalRoutes);          // Module 4
router.use('/discovery-runs',        discoveryRunRouter);      // Module 5
router.use('/discovery-candidates',  discoveryCandidateRouter);// Module 5
router.use('/solutions',             solutionsRouter);         // Module 5

export default router;
