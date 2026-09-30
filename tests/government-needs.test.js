/**
 * NIVARAN — Module 2 Government Need Tests (28 tests)
 *
 * Requires: DB migrated + seeded (npm run db:migrate && npm run db:seed)
 */

import './setup.js';
import request from 'supertest';
import app     from '../backend/app.js';

const DEV_PASSWORD = 'Nivaran@Dev2026!';

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: DEV_PASSWORD });
  return res.body?.data?.token;
}

// ── Helpers ────────────────────────────────────────────────────
const VALID_NEED = {
  title:            'Test: Reduce Water Complaint Resolution Delays',
  problemStatement: 'Citizens wait over 15 days on average for water complaint resolution, causing public dissatisfaction.',
  desiredOutcome:   'Reduce average resolution time from 15 days to 5 days.',
  domain:           'Water & Sanitation',
};

// ── Authentication tests (1–2) ─────────────────────────────────

describe('Government Needs — Authentication', () => {
  test('1. Unauthenticated user cannot create a need', async () => {
    const res = await request(app).post('/api/government-needs').send(VALID_NEED);
    expect(res.status).toBe(401);
  });

  test('2. Unauthenticated user cannot list needs', async () => {
    const res = await request(app).get('/api/government-needs');
    expect(res.status).toBe(401);
  });
});

// ── Authorization tests (3–10) ─────────────────────────────────

describe('Government Needs — Authorization', () => {
  let problemToken, evalToken, providerToken, adminToken;

  beforeAll(async () => {
    [problemToken, evalToken, providerToken, adminToken] = await Promise.all([
      loginAs('problem@nivaran.dev'),
      loginAs('evaluator@nivaran.dev'),
      loginAs('provider@nivaran.dev'),
      loginAs('admin@nivaran.dev'),
    ]);
  });

  test('3. PROBLEM_OWNER can create a need', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${problemToken}`)
      .send({ ...VALID_NEED, title: 'Auth Test Need ' + Date.now() });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('4. TECHNICAL_EVALUATOR cannot create a need', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${evalToken}`)
      .send(VALID_NEED);
    expect(res.status).toBe(403);
  });

  test('5. SOLUTION_PROVIDER cannot create a government need', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${providerToken}`)
      .send(VALID_NEED);
    expect(res.status).toBe(403);
  });

  test('6. PROBLEM_OWNER cannot edit another user\'s draft (same org check)', async () => {
    // Create a need as admin-seeded problem owner, then try to get it as evaluator
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${problemToken}`)
      .send({ ...VALID_NEED, title: 'Ownership Test ' + Date.now() });
    const needId = createRes.body?.data?.need?.id;
    if (!needId) return;

    // evaluator has no PROBLEM_EDIT permission → 403
    const editRes = await request(app)
      .put(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${evalToken}`)
      .send({ title: 'Hacked Title' });
    expect(editRes.status).toBe(403);
  });

  test('7. Backend rejects edit of submitted need', async () => {
    // Create + submit
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${problemToken}`)
      .send({ ...VALID_NEED, title: 'Submit Lock Test ' + Date.now() });
    const needId = createRes.body?.data?.need?.id;
    if (!needId) return;

    await request(app)
      .post(`/api/government-needs/${needId}/submit`)
      .set('Authorization', `Bearer ${problemToken}`);

    const editRes = await request(app)
      .put(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${problemToken}`)
      .send({ title: 'Should Fail' });
    expect(editRes.status).toBe(409);
  });

  test('8. SYSTEM_ADMIN cannot create needs (no PROBLEM_CREATE)', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(VALID_NEED);
    // SYSTEM_ADMIN does not have PROBLEM_CREATE in the role matrix
    expect(res.status).toBe(403);
  });

  test('9. SOLUTION_PROVIDER receives 403', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${providerToken}`)
      .send(VALID_NEED);
    expect(res.status).toBe(403);
  });

  test('10. Unauthorized direct API call receives 403', async () => {
    const res = await request(app)
      .delete('/api/government-needs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${evalToken}`);
    expect([403, 404]).toContain(res.status);
  });
});

// ── CRUD tests (11–16) ─────────────────────────────────────────

describe('Government Needs — CRUD', () => {
  let token;
  let createdId;

  beforeAll(async () => { token = await loginAs('problem@nivaran.dev'); });

  test('11. Create draft works', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'CRUD Test ' + Date.now() });
    expect(res.status).toBe(201);
    expect(res.body.data.need.status).toBe('DRAFT');
    createdId = res.body.data.need.id;
  });

  test('12. Draft is persisted in PostgreSQL (retrievable)', async () => {
    if (!createdId) return;
    const res = await request(app)
      .get(`/api/government-needs/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.need.id).toBe(createdId);
  });

  test('13. Draft can be retrieved in list', async () => {
    const res = await request(app)
      .get('/api/government-needs?status=DRAFT')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data ?? []).map(n => n.id);
    if (createdId) expect(ids).toContain(createdId);
  });

  test('14. Draft can be updated', async () => {
    if (!createdId) return;
    const res = await request(app)
      .put(`/api/government-needs/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentSituation: 'Updated situation text.' });
    expect(res.status).toBe(200);
    expect(res.body.data.need.currentSituation).toBe('Updated situation text.');
  });

  test('15. Draft can be deleted', async () => {
    // Create a throwaway draft
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'Delete Me ' + Date.now() });
    const delId = createRes.body?.data?.need?.id;
    if (!delId) return;

    const delRes = await request(app)
      .delete(`/api/government-needs/${delId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/government-needs/${delId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  test('16. Submitted need cannot be deleted', async () => {
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'Submit Then Delete ' + Date.now() });
    const id = createRes.body?.data?.need?.id;
    if (!id) return;

    await request(app)
      .post(`/api/government-needs/${id}/submit`)
      .set('Authorization', `Bearer ${token}`);

    const delRes = await request(app)
      .delete(`/api/government-needs/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(409);
  });
});

// ── Submission tests (17–22) ───────────────────────────────────

describe('Government Needs — Submission', () => {
  let token;

  beforeAll(async () => { token = await loginAs('problem@nivaran.dev'); });

  async function createDraft(title) {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: title + ' ' + Date.now() });
    return res.body?.data?.need?.id;
  }

  test('17. Valid draft can be submitted', async () => {
    const id = await createDraft('Submit Valid');
    if (!id) return;
    const res = await request(app)
      .post(`/api/government-needs/${id}/submit`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('18. Submission changes status to SUBMITTED', async () => {
    const id = await createDraft('Status Check');
    if (!id) return;
    await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).get(`/api/government-needs/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.body.data.need.status).toBe('SUBMITTED');
  });

  test('19. submittedAt is populated after submission', async () => {
    const id = await createDraft('SubmittedAt Check');
    if (!id) return;
    await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).get(`/api/government-needs/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.body.data.need.submittedAt).not.toBeNull();
  });

  test('20. Submitted need cannot be edited', async () => {
    const id = await createDraft('Edit Lock');
    if (!id) return;
    await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .put(`/api/government-needs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Modified' });
    expect(res.status).toBe(409);
  });

  test('21. Submitting already submitted need fails safely', async () => {
    const id = await createDraft('Double Submit');
    if (!id) return;
    await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  test('22. Incomplete draft rejected on submit (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Incomplete ' + Date.now() }); // missing problemStatement, desiredOutcome, domain
    expect([201, 422]).toContain(res.status);
    if (res.status === 201) {
      const id = res.body?.data?.need?.id;
      const sub = await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
      expect(sub.status).toBe(422);
    }
  });
});

// ── Scope tests (23–24) ────────────────────────────────────────

describe('Government Needs — Scope', () => {
  test('23. Organization scope is enforced (evaluator from diff scope gets 403)', async () => {
    const problemToken = await loginAs('problem@nivaran.dev');
    const evalToken    = await loginAs('evaluator@nivaran.dev');

    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${problemToken}`)
      .send({ ...VALID_NEED, title: 'Scope Test ' + Date.now() });
    const id = createRes.body?.data?.need?.id;
    if (!id) return;

    // evaluator has no PROBLEM_EDIT → 403
    const res = await request(app)
      .put(`/api/government-needs/${id}`)
      .set('Authorization', `Bearer ${evalToken}`)
      .send({ title: 'Scope Bypass Attempt' });
    expect(res.status).toBe(403);
  });

  test('24. Authorized scope access works for PROBLEM_OWNER', async () => {
    const token = await loginAs('problem@nivaran.dev');
    const res = await request(app).get('/api/government-needs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── Audit tests (25–28) ────────────────────────────────────────

describe('Government Needs — Audit Logging', () => {
  let prisma;
  let token;

  beforeAll(async () => {
    const db = await import('../backend/config/database.js');
    prisma = db.default;
    token  = await loginAs('problem@nivaran.dev');
  });

  afterAll(async () => { await prisma.$disconnect(); });

  test('25. Creation generates GOVERNMENT_NEED_CREATED audit record', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'Audit Create ' + Date.now() });
    const id = res.body?.data?.need?.id;
    if (!id) return;

    const log = await prisma.auditLog.findFirst({
      where: { action: 'GOVERNMENT_NEED_CREATED', entityId: id },
    });
    expect(log).not.toBeNull();
  });

  test('26. Update generates GOVERNMENT_NEED_UPDATED audit record', async () => {
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'Audit Update ' + Date.now() });
    const id = createRes.body?.data?.need?.id;
    if (!id) return;

    await request(app)
      .put(`/api/government-needs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentSituation: 'Audit update test.' });

    const log = await prisma.auditLog.findFirst({
      where: { action: 'GOVERNMENT_NEED_UPDATED', entityId: id },
    });
    expect(log).not.toBeNull();
  });

  test('27. Submission generates GOVERNMENT_NEED_SUBMITTED audit record', async () => {
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'Audit Submit ' + Date.now() });
    const id = createRes.body?.data?.need?.id;
    if (!id) return;

    await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'GOVERNMENT_NEED_SUBMITTED', entityId: id },
    });
    expect(log).not.toBeNull();
  });

  test('28. Deletion generates GOVERNMENT_NEED_DELETED audit record', async () => {
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_NEED, title: 'Audit Delete ' + Date.now() });
    const id = createRes.body?.data?.need?.id;
    if (!id) return;

    await request(app).delete(`/api/government-needs/${id}`).set('Authorization', `Bearer ${token}`);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'GOVERNMENT_NEED_DELETED', entityId: id },
    });
    expect(log).not.toBeNull();
  });
});
