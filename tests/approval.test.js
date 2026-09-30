/**
 * NIVARAN — Module 4 Approval Workflow Tests (29 tests)
 *
 * Requires: DB migrated + seeded
 *   npm run db:migrate && node prisma/seed.js
 */

import './setup.js';
import request from 'supertest';
import app     from '../backend/app.js';

const DEV_PASSWORD = 'Nivaran@Dev2026!';

const EMAILS = {
  problem:  'problem@nivaran.dev',
  approver: 'approver@nivaran.dev',
  evaluator:'evaluator@nivaran.dev',
  admin:    'admin@nivaran.dev',
};

const VALID_NEED = {
  title:            'Approval Test: Water Complaint Delays',
  problemStatement: 'Citizens wait over 15 days on average for water complaint resolution.',
  desiredOutcome:   'Reduce average resolution from 15 to 5 days.',
  domain:           'Water & Sanitation',
};

// ── Token helpers ─────────────────────────────────────────────
async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: DEV_PASSWORD });
  return res.body?.data?.token;
}

async function createAndSubmit(token) {
  const createRes = await request(app)
    .post('/api/government-needs')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...VALID_NEED, title: VALID_NEED.title + ' ' + Date.now() });
  const id = createRes.body?.data?.need?.id;
  if (!id) throw new Error('Could not create need');
  await request(app).post(`/api/government-needs/${id}/submit`).set('Authorization', `Bearer ${token}`);
  return id;
}

// ─────────────────────────────────────────────────────────────
// TESTS 1–3: Submission & Queue
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Submission & Queue', () => {
  let pToken, aToken, needId;

  beforeAll(async () => {
    pToken = await loginAs(EMAILS.problem);
    aToken = await loginAs(EMAILS.approver);
  });

  test('1. Problem Owner can submit a Government Need', async () => {
    const res = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${pToken}`)
      .send({ ...VALID_NEED, title: 'Submit Test ' + Date.now() });
    expect(res.status).toBe(201);
    needId = res.body.data.need.id;

    const sub = await request(app)
      .post(`/api/government-needs/${needId}/submit`)
      .set('Authorization', `Bearer ${pToken}`);
    expect(sub.status).toBe(200);
    expect(sub.body.data.need.status).toBe('SUBMITTED');
  });

  test('2. Submitted need appears in approval queue for Approving Authority', async () => {
    if (!needId) return;
    const res = await request(app)
      .get('/api/approvals?status=SUBMITTED')
      .set('Authorization', `Bearer ${aToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data ?? []).map(n => n.id);
    expect(ids).toContain(needId);
  });

  test('3. Approving Authority can view the need', async () => {
    if (!needId) return;
    const res = await request(app)
      .get(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${aToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.need.id).toBe(needId);
  });
});

// ─────────────────────────────────────────────────────────────
// TESTS 4–7: Approve flow
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Approve', () => {
  let pToken, aToken, needId, prisma;

  beforeAll(async () => {
    pToken = await loginAs(EMAILS.problem);
    aToken = await loginAs(EMAILS.approver);
    needId = await createAndSubmit(pToken);
    const db = await import('../backend/config/database.js');
    prisma = db.default;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  test('4. Approving Authority can approve', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/approve`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ comment: 'Well-structured problem.' });
    expect(res.status).toBe(200);
  });

  test('5. Approval changes status to APPROVED', async () => {
    const res = await request(app)
      .get(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${aToken}`);
    expect(res.body.data.need.status).toBe('APPROVED');
  });

  test('6. Approval creates review history record', async () => {
    const history = await prisma.governmentNeedReview.findFirst({
      where: { governmentNeedId: needId, action: 'APPROVED' },
    });
    expect(history).not.toBeNull();
    expect(history.toStatus).toBe('APPROVED');
  });

  test('7. Approval creates audit event', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { action: 'GOVERNMENT_NEED_APPROVED', entityId: needId },
    });
    expect(log).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TESTS 8–11: Reject flow
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Reject', () => {
  let pToken, aToken, needId, prisma;

  beforeAll(async () => {
    pToken = await loginAs(EMAILS.problem);
    aToken = await loginAs(EMAILS.approver);
    needId = await createAndSubmit(pToken);
    const db = await import('../backend/config/database.js');
    prisma = db.default;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  test('9. Rejection requires a reason', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/reject`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ reason: '' });
    expect(res.status).toBe(422);
  });

  test('8. Approving Authority can reject with reason', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/reject`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ reason: 'The problem statement does not identify a clear operational gap.' });
    expect(res.status).toBe(200);
  });

  test('10. Rejection changes status to REJECTED', async () => {
    const res = await request(app)
      .get(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${aToken}`);
    expect(res.body.data.need.status).toBe('REJECTED');
  });

  test('11. Rejection history is preserved', async () => {
    const history = await prisma.governmentNeedReview.findFirst({
      where: { governmentNeedId: needId, action: 'REJECTED' },
    });
    expect(history).not.toBeNull();
    expect(history.comment).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// TESTS 12–18: Send Back + Resubmit flow
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Send Back & Resubmit', () => {
  let pToken, aToken, needId, prisma;

  beforeAll(async () => {
    pToken = await loginAs(EMAILS.problem);
    aToken = await loginAs(EMAILS.approver);
    needId = await createAndSubmit(pToken);
    const db = await import('../backend/config/database.js');
    prisma = db.default;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  test('12. Approving Authority can send back', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/send-back`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ reason: 'Please provide baseline information for the current process.' });
    expect(res.status).toBe(200);
  });

  test('13. Send Back requires a reason', async () => {
    const newId = await createAndSubmit(pToken);
    const res = await request(app)
      .post(`/api/government-needs/${newId}/send-back`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ reason: '' });
    expect(res.status).toBe(422);
  });

  test('14. SENT_BACK status is visible', async () => {
    const res = await request(app)
      .get(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${pToken}`);
    expect(res.body.data.need.status).toBe('SENT_BACK');
  });

  test('15. Problem Owner can edit SENT_BACK need', async () => {
    const res = await request(app)
      .put(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${pToken}`)
      .send({ baselineInformation: 'Current average: 15 days. Data source: GRM system.' });
    expect(res.status).toBe(200);
  });

  test('16. Problem Owner can resubmit SENT_BACK need', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/resubmit`)
      .set('Authorization', `Bearer ${pToken}`);
    expect(res.status).toBe(200);
  });

  test('17. Resubmission changes status back to SUBMITTED', async () => {
    const res = await request(app)
      .get(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${pToken}`);
    expect(res.body.data.need.status).toBe('SUBMITTED');
  });

  test('18. Previous review history remains after resubmission', async () => {
    const history = await prisma.governmentNeedReview.findMany({
      where: { governmentNeedId: needId },
      orderBy: { createdAt: 'asc' },
    });
    const actions = history.map(h => h.action);
    expect(actions).toContain('SENT_BACK');
    expect(actions).toContain('RESUBMITTED');
  });
});

// ─────────────────────────────────────────────────────────────
// TESTS 19–22: Authorization guards
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Authorization Guards', () => {
  let pToken, aToken, evalToken, needId;

  beforeAll(async () => {
    pToken    = await loginAs(EMAILS.problem);
    aToken    = await loginAs(EMAILS.approver);
    evalToken = await loginAs(EMAILS.evaluator);
    needId    = await createAndSubmit(pToken);
  });

  test('19. Problem Owner cannot self-approve', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/approve`)
      .set('Authorization', `Bearer ${pToken}`)
      .send({ comment: '' });
    expect([403, 422]).toContain(res.status);
  });

  test('20. Non-Approving Authority receives 403 on approve', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/approve`)
      .set('Authorization', `Bearer ${evalToken}`)
      .send({ comment: '' });
    expect(res.status).toBe(403);
  });

  test('21. Unauthenticated request receives 401', async () => {
    const res = await request(app)
      .post(`/api/government-needs/${needId}/approve`)
      .send({ comment: '' });
    expect(res.status).toBe(401);
  });

  test('22. Direct status manipulation via PUT is blocked', async () => {
    // PUT cannot change status field — it is ignored/blocked
    const res = await request(app)
      .put(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${pToken}`)
      .send({ status: 'APPROVED' });
    // Either 409 (not DRAFT/SENT_BACK) or the field is ignored
    // Status must NOT become APPROVED via this route
    if (res.status === 200) {
      const getRes = await request(app)
        .get(`/api/government-needs/${needId}`)
        .set('Authorization', `Bearer ${pToken}`);
      expect(getRes.body.data.need.status).not.toBe('APPROVED');
    } else {
      expect([409, 403, 422]).toContain(res.status);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// TESTS 23–26: Post-decision state guards
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Post-Decision State Guards', () => {
  let pToken, aToken;

  beforeAll(async () => {
    pToken = await loginAs(EMAILS.problem);
    aToken = await loginAs(EMAILS.approver);
  });

  test('23. APPROVED need cannot be edited by Problem Owner', async () => {
    const id = await createAndSubmit(pToken);
    await request(app).post(`/api/government-needs/${id}/approve`).set('Authorization', `Bearer ${aToken}`).send({});
    const res = await request(app)
      .put(`/api/government-needs/${id}`)
      .set('Authorization', `Bearer ${pToken}`)
      .send({ title: 'Should Fail' });
    expect(res.status).toBe(409);
  });

  test('24. REJECTED need cannot be resubmitted', async () => {
    const id = await createAndSubmit(pToken);
    await request(app).post(`/api/government-needs/${id}/reject`).set('Authorization', `Bearer ${aToken}`)
      .send({ reason: 'Insufficient information provided in the problem statement.' });
    const res = await request(app)
      .post(`/api/government-needs/${id}/resubmit`)
      .set('Authorization', `Bearer ${pToken}`);
    expect(res.status).toBe(409);
  });

  test('25. Double approval is rejected (concurrent conflict)', async () => {
    const id = await createAndSubmit(pToken);
    await request(app).post(`/api/government-needs/${id}/approve`).set('Authorization', `Bearer ${aToken}`).send({});
    const res = await request(app)
      .post(`/api/government-needs/${id}/approve`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({});
    expect(res.status).toBe(409);
  });

  test('26. Invalid transition DRAFT→APPROVED is blocked', async () => {
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${pToken}`)
      .send({ ...VALID_NEED, title: 'Invalid Transition ' + Date.now() });
    const id = createRes.body?.data?.need?.id;
    // Try to approve a DRAFT (not SUBMITTED)
    const res = await request(app)
      .post(`/api/government-needs/${id}/approve`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({});
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────
// TESTS 27–29: Data integrity
// ─────────────────────────────────────────────────────────────
describe('Module 4 — Data Integrity', () => {
  let pToken, aToken, needId, originalTitle, prisma;

  beforeAll(async () => {
    pToken = await loginAs(EMAILS.problem);
    aToken = await loginAs(EMAILS.approver);
    const db = await import('../backend/config/database.js');
    prisma = db.default;

    // Create a need with a specific title
    originalTitle = 'Integrity Test ' + Date.now();
    const createRes = await request(app)
      .post('/api/government-needs')
      .set('Authorization', `Bearer ${pToken}`)
      .send({ ...VALID_NEED, title: originalTitle });
    needId = createRes.body?.data?.need?.id;
    await request(app).post(`/api/government-needs/${needId}/submit`).set('Authorization', `Bearer ${pToken}`);
  });
  afterAll(async () => { await prisma.$disconnect(); });

  test('27. Original Government Need content unchanged after approval', async () => {
    await request(app)
      .post(`/api/government-needs/${needId}/approve`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ comment: 'Approved as-is.' });

    const res = await request(app)
      .get(`/api/government-needs/${needId}`)
      .set('Authorization', `Bearer ${aToken}`);
    expect(res.body.data.need.title).toBe(originalTitle);
    expect(res.body.data.need.problemStatement).toBe(VALID_NEED.problemStatement);
    expect(res.body.data.need.desiredOutcome).toBe(VALID_NEED.desiredOutcome);
  });

  test('28. Audit history remains intact throughout workflow', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: needId },
      orderBy: { createdAt: 'asc' },
    });
    const actions = logs.map(l => l.action);
    expect(actions).toContain('GOVERNMENT_NEED_CREATED');
    expect(actions).toContain('GOVERNMENT_NEED_SUBMITTED');
    expect(actions).toContain('GOVERNMENT_NEED_APPROVED');
  });

  test('29. Review history is immutable (records not deleted)', async () => {
    const reviews = await prisma.governmentNeedReview.findMany({
      where: { governmentNeedId: needId },
    });
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    // All review rows for this need should still exist
    const actions = reviews.map(r => r.action);
    expect(actions).toContain('APPROVED');
  });
});
