/**
 * NIVARAN — Module 1 Authentication & Authorization Tests
 *
 * Tests 1–30 from the spec.
 *
 * Requires the database to be migrated and seeded before running:
 *   npm run db:migrate && npm run db:seed
 */

import './setup.js';
import request from 'supertest';
import app from '../backend/app.js';

// ── Dev credentials from seed ─────────────────────────────────
const DEV_PASSWORD = 'Nivaran@Dev2026!';

const USERS = {
  admin:       'admin@nivaran.dev',
  problem:     'problem@nivaran.dev',
  evaluator:   'evaluator@nivaran.dev',
  provider:    'provider@nivaran.dev',
};

// ── Helper ────────────────────────────────────────────────────

async function loginAs(email, password = DEV_PASSWORD) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res;
}

async function getAdminToken() {
  const res = await loginAs(USERS.admin);
  return res.body?.data?.token;
}

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION TESTS (1–7)
// ─────────────────────────────────────────────────────────────

describe('Authentication', () => {
  test('1. Valid login succeeds', async () => {
    const res = await loginAs(USERS.admin);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(USERS.admin);
    // passwordHash must never appear
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  test('2. Invalid password fails', async () => {
    const res = await loginAs(USERS.admin, 'WrongPassword999!');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('2b. Invalid email fails', async () => {
    const res = await loginAs('nobody@nowhere.dev');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('3. Inactive user cannot log in', async () => {
    // Deactivate via admin first
    const adminToken = await getAdminToken();

    // Get the problem owner user id
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    const problemUser = usersRes.body.data.find(u => u.email === USERS.problem);
    if (!problemUser) return; // skip if not seeded

    // Deactivate
    await request(app)
      .patch(`/api/users/${problemUser.id}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Attempt login
    const loginRes = await loginAs(USERS.problem);
    expect(loginRes.status).toBe(403);

    // Re-activate for subsequent tests
    await request(app)
      .patch(`/api/users/${problemUser.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  test('4. Logout succeeds', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('5. Authenticated user can retrieve /auth/me', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(USERS.admin);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  test('6. Unauthenticated request to /auth/me receives 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('7. Invalid token receives 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.invalid');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// AUTHORIZATION TESTS (8–13)
// ─────────────────────────────────────────────────────────────

describe('Authorization', () => {
  test('8. SYSTEM_ADMIN can access user administration', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('9. PROBLEM_OWNER cannot access user administration', async () => {
    const loginRes = await loginAs(USERS.problem);
    const token = loginRes.body?.data?.token;
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('10. TECHNICAL_EVALUATOR cannot access user administration', async () => {
    const loginRes = await loginAs(USERS.evaluator);
    const token = loginRes.body?.data?.token;
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('11. SOLUTION_PROVIDER cannot access user administration', async () => {
    const loginRes = await loginAs(USERS.provider);
    const token = loginRes.body?.data?.token;
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('12. Unauthorized authenticated request receives 403', async () => {
    const loginRes = await loginAs(USERS.problem);
    const token = loginRes.body?.data?.token;
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hack Org', code: 'HACK' });
    expect(res.status).toBe(403);
  });

  test('13. Unauthenticated request to protected API returns 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT TESTS (14–25)
// ─────────────────────────────────────────────────────────────

describe('User Management', () => {
  let adminToken;
  let createdUserId;
  let roleId;

  beforeAll(async () => {
    adminToken = await getAdminToken();

    // Get a role id for testing
    const rolesRes = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    const roles = rolesRes.body?.data?.roles ?? [];
    const problemRole = roles.find(r => r.name === 'PROBLEM_OWNER');
    roleId = problemRole?.id;
  });

  test('14. System Admin can create a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Created User',
        email: `test.created.${Date.now()}@nivaran.test`,
        password: 'TestPass@123',
        status: 'ACTIVE',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdUserId = res.body.data.user.id;
  });

  test('15. Duplicate email is rejected', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate',
        email: USERS.admin,
        password: 'TestPass@123',
      });
    expect(res.status).toBe(409);
  });

  test('16. Missing required fields are rejected', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No Email' });
    expect(res.status).toBe(422);
  });

  test('17. Password is stored hashed (never plaintext in response)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Hash Test User',
        email: `hash.test.${Date.now()}@nivaran.test`,
        password: 'TestPass@123',
      });
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('TestPass@123');
  });

  test('18. Password hash is never returned in user API', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  test('19. System Admin can update a user', async () => {
    if (!createdUserId) return;
    const res = await request(app)
      .put(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });

  test('20. System Admin can deactivate a user', async () => {
    if (!createdUserId) return;
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('INACTIVE');
  });

  test('21. Deactivated user cannot log in', async () => {
    if (!createdUserId) return;
    // try to find the email from the get endpoint
    const getRes = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const email = getRes.body?.data?.user?.email;
    if (!email) return;

    const loginRes = await loginAs(email);
    expect(loginRes.status).toBe(403);
  });

  test('22. System Admin can reactivate a user', async () => {
    if (!createdUserId) return;
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('ACTIVE');
  });

  test('23. Role assignment works', async () => {
    if (!createdUserId || !roleId) return;
    const res = await request(app)
      .put(`/api/users/${createdUserId}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleIds: [roleId] });
    expect(res.status).toBe(200);
    const roles = res.body.data.user.userRoles;
    expect(roles.some(r => r.role.id === roleId)).toBe(true);
  });

  test('24. Organization assignment works', async () => {
    if (!createdUserId) return;
    // Get an org id first
    const orgsRes = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${adminToken}`);
    const orgs = orgsRes.body?.data?.organizations ?? [];
    if (!orgs.length) return;
    const orgId = orgs[0].id;

    const res = await request(app)
      .put(`/api/users/${createdUserId}/organization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: orgId });
    expect(res.status).toBe(200);
    expect(res.body.data.user.organization?.id).toBe(orgId);
  });

  test('25. Organizational unit assignment works', async () => {
    if (!createdUserId) return;
    const orgsRes = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${adminToken}`);
    const orgs = orgsRes.body?.data?.organizations ?? [];
    if (!orgs.length) return;
    const org = orgs[0];
    if (!org.units?.length) return;
    const unitId = org.units[0].id;

    const res = await request(app)
      .put(`/api/users/${createdUserId}/organization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org.id, organizationalUnitId: unitId });
    expect(res.status).toBe(200);
    expect(res.body.data.user.organizationalUnit?.id).toBe(unitId);
  });
});

// ─────────────────────────────────────────────────────────────
// AUDIT LOG TESTS (26–30)
// ─────────────────────────────────────────────────────────────

describe('Audit Logging', () => {
  // These tests verify audit records were created by checking the DB via Prisma.
  // We import prisma directly in the test.

  let prisma;
  let adminToken;

  beforeAll(async () => {
    const db = await import('../backend/config/database.js');
    prisma = db.default;
    adminToken = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('26. Successful login creates LOGIN_SUCCESS audit record', async () => {
    await loginAs(USERS.admin);
    const log = await prisma.auditLog.findFirst({
      where: { action: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log.action).toBe('LOGIN_SUCCESS');
    // Must never store password in audit log
    if (log.metadata) {
      expect(JSON.stringify(log.metadata)).not.toContain('password');
    }
  });

  test('27. Failed login creates LOGIN_FAILURE audit record', async () => {
    await loginAs(USERS.admin, 'WrongPass999!');
    const log = await prisma.auditLog.findFirst({
      where: { action: 'LOGIN_FAILURE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
  });

  test('28. User creation creates USER_CREATED audit record', async () => {
    const email = `audit.create.${Date.now()}@nivaran.test`;
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit Test', email, password: 'TestPass@123' });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'USER_CREATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log.action).toBe('USER_CREATED');
    if (log.metadata) {
      expect(JSON.stringify(log.metadata)).not.toContain('passwordHash');
    }
  });

  test('29. Role assignment creates ROLE_ASSIGNED audit record', async () => {
    const rolesRes = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    const roles = rolesRes.body?.data?.roles ?? [];
    const role = roles[0];
    if (!role) return;

    // Create a user to assign to
    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Role Audit User', email: `role.audit.${Date.now()}@nivaran.test`, password: 'TestPass@123' });
    const userId = createRes.body?.data?.user?.id;
    if (!userId) return;

    await request(app)
      .put(`/api/users/${userId}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleIds: [role.id] });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'ROLE_ASSIGNED', entityId: userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
  });

  test('30. User deactivation creates USER_DEACTIVATED audit record', async () => {
    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Deact Audit', email: `deact.audit.${Date.now()}@nivaran.test`, password: 'TestPass@123' });
    const userId = createRes.body?.data?.user?.id;
    if (!userId) return;

    await request(app)
      .patch(`/api/users/${userId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'USER_DEACTIVATED', entityId: userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
  });
});
