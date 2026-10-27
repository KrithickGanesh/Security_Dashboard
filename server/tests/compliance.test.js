import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import Vulnerability from '../src/models/Vulnerability.js';
import Framework from '../src/models/Framework.js';
import Control from '../src/models/Control.js';
import Assessment from '../src/models/Assessment.js';

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_test_db';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe('Module 5: Compliance Frameworks & Assessment Scoring Suite', () => {
  let adminToken;
  let devToken;
  let analystToken;
  let testProject;
  let testFramework;
  let testControl;

  beforeEach(async () => {
    await Assessment.deleteMany({});
    await Control.deleteMany({});
    await Framework.deleteMany({});
    await Vulnerability.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    // Admin
    const admin = await User.create({
      name: 'Compliance Admin',
      email: 'admin@compliance.test',
      password: 'Password123!',
      role: 'Admin'
    });
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@compliance.test', password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    // Analyst
    const analyst = await User.create({
      name: 'Security Analyst',
      email: 'analyst@compliance.test',
      password: 'Password123!',
      role: 'Security Analyst'
    });
    const analystLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@compliance.test', password: 'Password123!' });
    analystToken = analystLogin.body.data.accessToken;

    // Dev
    const dev = await User.create({
      name: 'Dev Engineer',
      email: 'dev@compliance.test',
      password: 'Password123!',
      role: 'Developer'
    });
    const devLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dev@compliance.test', password: 'Password123!' });
    devToken = devLogin.body.data.accessToken;

    // Base Project
    testProject = await Project.create({
      name: 'banking-core',
      key: 'BANK-CORE',
      criticality: 'Critical'
    });

    // Base Framework
    testFramework = await Framework.create({
      name: 'OWASP Top 10 (2021)',
      code: 'OWASP-2021',
      version: '2021',
      category: 'Application Security'
    });

    // Base Control with mapped CWEs
    testControl = await Control.create({
      framework: testFramework._id,
      controlId: 'A01:2021',
      title: 'Broken Access Control',
      domain: 'Access Control',
      mappedCwEs: ['CWE-798', 'CWE-200']
    });
  });

  describe('Framework and Control Governance', () => {
    it('should allow Admin to create framework but block Developer with 403', async () => {
      const devRes = await request(app)
        .post('/api/v1/frameworks')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'NIST CSF',
          code: 'NIST-CSF'
        });
      expect(devRes.status).toBe(403);

      const adminRes = await request(app)
        .post('/api/v1/frameworks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'NIST CSF',
          code: 'NIST-CSF',
          version: '1.1'
        });
      expect(adminRes.status).toBe(201);
      expect(adminRes.body.data.framework.code).toBe('NIST-CSF');
    });

    it('should list frameworks with controlsCount', async () => {
      const res = await request(app)
        .get('/api/v1/frameworks')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.frameworks.length).toBe(1);
      expect(res.body.data.frameworks[0].controlsCount).toBe(1);
    });
  });

  describe('Automated Compliance Evaluation Against Vulnerabilities', () => {
    it('should auto-initialize assessments and evaluate non-compliance when matching CWE vulnerability exists', async () => {
      // 1. Fetch assessments: initializes baseline assessment
      const initRes = await request(app)
        .get(`/api/v1/assessments?project=${testProject._id}&framework=${testFramework._id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      expect(initRes.status).toBe(200);
      expect(initRes.body.data.assessments.length).toBe(1);
      expect(initRes.body.data.summary.complianceScore).toBe(100);

      // 2. Introduce a vulnerability with matching CWE-798
      const vuln = await Vulnerability.create({
        fingerprint: 'fp-compliance-001',
        project: testProject._id,
        title: 'Hardcoded API Token in Config',
        severity: 'Critical',
        status: 'Open',
        tool: 'gitleaks',
        scanType: 'Secret',
        cwe: ['CWE-798'],
        slaDueDate: new Date()
      });

      // 3. Trigger automated project evaluation
      const evalRes = await request(app)
        .post(`/api/v1/assessments/evaluate/${testProject._id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.data.updatedCount).toBe(1);

      // 4. Fetch assessments again -> control is now Non-Compliant with score 0
      const updatedRes = await request(app)
        .get(`/api/v1/assessments?project=${testProject._id}&framework=${testFramework._id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      const assessment = updatedRes.body.data.assessments[0];
      expect(assessment.status).toBe('Non-Compliant');
      expect(assessment.score).toBe(0);
      expect(assessment.mappedVulnerabilities.length).toBe(1);
      expect(updatedRes.body.data.summary.complianceScore).toBe(0);

      // 5. Resolve the vulnerability
      vuln.status = 'Resolved';
      await vuln.save();

      // 6. Re-evaluate
      await request(app)
        .post(`/api/v1/assessments/evaluate/${testProject._id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      const resolvedRes = await request(app)
        .get(`/api/v1/assessments?project=${testProject._id}&framework=${testFramework._id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      expect(resolvedRes.body.data.assessments[0].status).toBe('Compliant');
      expect(resolvedRes.body.data.summary.complianceScore).toBe(100);
    });

    it('should allow Analyst to manually update assessment evidence and status', async () => {
      // Initialize assessment
      const listRes = await request(app)
        .get(`/api/v1/assessments?project=${testProject._id}&framework=${testFramework._id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      const assessmentId = listRes.body.data.assessments[0]._id;

      const patchRes = await request(app)
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          status: 'Partially Compliant',
          score: 50,
          evidenceNotes: 'Role-based access controls partially implemented. 2FA rollout pending.'
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.assessment.status).toBe('Partially Compliant');
      expect(patchRes.body.data.assessment.score).toBe(50);
      expect(patchRes.body.data.assessment.evaluatedBy.name).toBe('Security Analyst');
    });
  });
});
