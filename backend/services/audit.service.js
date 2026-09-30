/**
 * NIVARAN — Audit Service
 *
 * Creates audit log records.
 * NEVER stores: password, passwordHash, API keys, tokens, secrets.
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * @param {object} params
 * @param {string|null}  params.actorId
 * @param {string}       params.action        — e.g. LOGIN_SUCCESS
 * @param {string|null}  params.entityType    — e.g. 'User'
 * @param {string|null}  params.entityId
 * @param {string|null}  params.organizationId
 * @param {object|null}  params.metadata
 * @param {string|null}  params.ipAddress
 * @param {string|null}  params.userAgent
 */
export async function createAuditLog(params) {
  const {
    actorId        = null,
    action,
    entityType     = null,
    entityId       = null,
    organizationId = null,
    metadata       = null,
    ipAddress      = null,
    userAgent      = null,
  } = params;

  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        organizationId,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Audit log failure must never crash the application
    logger.error(`[AuditLog] Failed to write audit record (action=${action}):`, err.message);
  }
}
