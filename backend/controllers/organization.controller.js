/**
 * NIVARAN — Organization Controller
 */

import * as orgService from '../services/organization.service.js';
import { sendSuccess } from '../utils/response.js';

// ── Organizations ──────────────────────────────────────────────

export async function listOrganizations(req, res, next) {
  try {
    const orgs = await orgService.listOrganizations();
    return sendSuccess(res, { organizations: orgs });
  } catch (err) { next(err); }
}

export async function getOrganization(req, res, next) {
  try {
    const org = await orgService.getOrganizationById(req.params.id);
    return sendSuccess(res, { organization: org });
  } catch (err) { next(err); }
}

export async function createOrganization(req, res, next) {
  try {
    const org = await orgService.createOrganization(req.body);
    return sendSuccess(res, { organization: org }, 201);
  } catch (err) { next(err); }
}

export async function updateOrganization(req, res, next) {
  try {
    const org = await orgService.updateOrganization(req.params.id, req.body);
    return sendSuccess(res, { organization: org });
  } catch (err) { next(err); }
}

// ── Organizational Units ───────────────────────────────────────

export async function listUnits(req, res, next) {
  try {
    const units = await orgService.listUnits(req.params.organizationId);
    return sendSuccess(res, { units });
  } catch (err) { next(err); }
}

export async function createUnit(req, res, next) {
  try {
    const unit = await orgService.createUnit(req.params.organizationId, req.body);
    return sendSuccess(res, { unit }, 201);
  } catch (err) { next(err); }
}

export async function updateUnit(req, res, next) {
  try {
    const unit = await orgService.updateUnit(req.params.unitId, req.body);
    return sendSuccess(res, { unit });
  } catch (err) { next(err); }
}

// ── Roles (for admin dropdowns) ────────────────────────────────

export async function listRoles(req, res, next) {
  try {
    const roles = await orgService.listRoles();
    return sendSuccess(res, { roles });
  } catch (err) { next(err); }
}
