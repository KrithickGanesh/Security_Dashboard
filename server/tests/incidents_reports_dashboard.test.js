import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import Vulnerability from '../src/models/Vulnerability.js';
import Incident from '../src/models/Incident.js';

describe('Incidents, Reports & Dashboard Suite Tests', () => {
  let analystToken;
  let devToken;
  let analystUser;
  let devUser;
  let testProject;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Clean test models
    await Promise.all([
      User.deleteMany({ email: { $regex: /@ird-test\.com$/ } }),
      Project.deleteMany({ key: 'IRD-TEST' }),
      Incident.deleteMany({ title: { $regex: /Test Incident/ } })
    ]);

    // Create Analyst user
    analystUser = await User.create({
      name: 'Incident Responder',
      email: 'analyst@ird-test.com',
      password: 'Password123!',
      role: 'Security Analyst'
    });

    // Create Developer user
    devUser = await User.create({
      name: 'Incident Assignee',
      email: 'dev@ird-test.com',
      password: 'Password123!',
      role: 'Developer'
    });

    // Create Test Project
    testProject = await Project.create({
      name: 'Incident Response Test Project',
      key: 'IRD-TEST',
      repository: 'https://github.com/org/ird-service'
    });

    // Create a sample vulnerability
    await Vulnerability.create({
      title: 'SQL Injection in user query',
      fingerprint: 'ird-test-fp-1',
      severity: 'Critical',
      tool: 'semgrep',
      scanType: 'SAST',
      project: testProject._id,
      slaDueDate: new Date(Date.now() + 48 * 3600 * 1000)
    });

    // Log in analyst
    const analystRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@ird-test.com', password: 'Password123!' });
    analystToken = analystRes.body.data.accessToken;

    // Log in dev
    const devRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dev@ird-test.com', password: 'Password123!' });
    devToken = devRes.body.data.accessToken;
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $regex: /@ird-test\.com$/ } }),
      Project.deleteMany({ key: 'IRD-TEST' }),
      Vulnerability.deleteMany({ fingerprint: 'ird-test-fp-1' }),
      Incident.deleteMany({ title: { $regex: /Test Incident/ } })
    ]);
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/dashboard/stats returns aggregate metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('overview');
    expect(res.body.data).toHaveProperty('severityBreakdown');
    expect(res.body.data).toHaveProperty('complianceScores');
    expect(res.body.data.overview.totalProjects).toBeGreaterThanOrEqual(1);
  });

  it('2. POST /api/v1/incidents creates security incident with audit log and notification', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        title: 'Test Incident: Active Token Exposure',
        description: 'Hardcoded secret identified in recent commit push',
        severity: 'Critical',
        project: testProject._id,
        assignedTo: devUser._id
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('incidentId');
    expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(1);
  });

  it('3. PATCH /api/v1/incidents/:id/status updates incident status and appends timeline', async () => {
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        title: 'Test Incident: API Rate Limiting Bypass',
        description: 'DoS potential identified in public endpoint',
        severity: 'High',
        project: testProject._id
      });

    const incId = createRes.body.data._id;

    const patchRes = await request(app)
      .patch(`/api/v1/incidents/${incId}/status`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        status: 'Contained',
        notes: 'Applied emergency rate limiter rule in gateway'
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('Contained');
    expect(patchRes.body.data.timeline.length).toBe(2);
  });

  it('4. GET /api/v1/reports/executive-summary/pdf returns streamed PDF report', async () => {
    const res = await request(app)
      .get('/api/v1/reports/executive-summary/pdf')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/application\/pdf/);
  });

  it('5. GET /api/v1/reports/vulnerabilities/csv exports dataset with CSV headers', async () => {
    const res = await request(app)
      .get('/api/v1/reports/vulnerabilities/csv')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('fingerprint');
    expect(res.text).toContain('severity');
  });
});
