import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import Vulnerability from '../src/models/Vulnerability.js';
import { calculateSlaDueDate } from '../src/utils/sla.js';

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

describe('Module 3: Projects & Vulnerabilities Management Suite', () => {
  let adminToken;
  let devToken;
  let analystToken;
  let testProject;

  beforeEach(async () => {
    await Vulnerability.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    // Create Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.local',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    // Elevate admin
    await User.findByIdAndUpdate(adminRes.body.data.user._id, { role: 'Admin' });
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.local', password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    // Create Analyst
    const analystRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Analyst User',
        email: 'analyst@test.local',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    await User.findByIdAndUpdate(analystRes.body.data.user._id, { role: 'Security Analyst' });
    const analystLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@test.local', password: 'Password123!' });
    analystToken = analystLogin.body.data.accessToken;

    // Create Dev
    const devRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dev User',
        email: 'dev@test.local',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    devToken = devRes.body.data.accessToken;

    // Create a base project using admin
    const pRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Payment Service',
        key: 'PAY-SVC',
        description: 'Payment microservice API',
        criticality: 'Critical'
      });
    testProject = pRes.body.data.project;
  });

  describe('Project Management & RBAC', () => {
    it('should allow Admin and Analyst to create projects but deny Developer (403)', async () => {
      // Dev attempt -> 403
      const devAttempt = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'Unauthorized Project',
          key: 'UNAUTH-1'
        });
      expect(devAttempt.status).toBe(403);

      // Analyst attempt -> 201
      const analystAttempt = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          name: 'Identity Service',
          key: 'ID-SVC',
          criticality: 'High'
        });
      expect(analystAttempt.status).toBe(201);
      expect(analystAttempt.body.data.project.key).toBe('ID-SVC');
    });

    it('should reject duplicate project name or key with 409', async () => {
      const dup = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Payment Service', // Duplicate name
          key: 'DIFF-KEY'
        });
      expect(dup.status).toBe(409);
    });

    it('should list projects with vulnerability counts', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.projects.length).toBe(1);
      expect(res.body.data.projects[0].vulnerabilityCounts).toBeDefined();
    });
  });

  describe('Vulnerability Lifecycle & SLA Logic', () => {
    let testVuln;

    beforeEach(async () => {
      testVuln = await Vulnerability.create({
        fingerprint: 'sha256-dummy-fingerprint-001',
        project: testProject._id,
        title: 'Remote Code Execution in Apache Commons',
        severity: 'Critical',
        status: 'Open',
        cve: 'CVE-2024-9999',
        tool: 'trivy',
        scanType: 'SCA',
        component: 'commons-text',
        version: '1.9',
        fixedVersion: '1.10.0',
        slaDueDate: calculateSlaDueDate('Critical')
      });
    });

    it('should calculate correct SLA due date (2 days for Critical)', async () => {
      const diffMs = testVuln.slaDueDate.getTime() - Date.now();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(2);
    });

    it('should enforce unique compound index on fingerprint + project', async () => {
      let duplicateError = null;
      try {
        await Vulnerability.create({
          fingerprint: 'sha256-dummy-fingerprint-001', // Duplicate for same project
          project: testProject._id,
          title: 'Duplicate finding',
          severity: 'Critical',
          tool: 'trivy',
          scanType: 'SCA',
          slaDueDate: new Date()
        });
      } catch (err) {
        duplicateError = err;
      }
      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000);
    });

    it('should allow Developer to update remediation status and log activity', async () => {
      const res = await request(app)
        .patch(`/api/v1/vulnerabilities/${testVuln._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          status: 'Resolved',
          reason: 'Upgraded commons-text to version 1.10.0 in pom.xml'
        });

      expect(res.status).toBe(200);
      const updated = res.body.data.vulnerability;
      expect(updated.status).toBe('Resolved');
      expect(updated.resolvedAt).toBeDefined();
      expect(updated.resolutionReason).toMatch(/Upgraded commons-text/);
      expect(updated.activityTimeline.length).toBeGreaterThan(0);
      expect(updated.activityTimeline[0].action).toBe('STATUS_CHANGE');
    });

    it('should add a comment with author populated', async () => {
      const res = await request(app)
        .post(`/api/v1/vulnerabilities/${testVuln._id}/comments`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          content: 'PR #142 submitted with dependency upgrade.'
        });

      expect(res.status).toBe(201);
      const comments = res.body.data.vulnerability.comments;
      expect(comments.length).toBe(1);
      expect(comments[0].content).toBe('PR #142 submitted with dependency upgrade.');
      expect(comments[0].author.name).toBe('Dev User');
    });
  });
});
