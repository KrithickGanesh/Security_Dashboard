import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import ApiKey from '../src/models/ApiKey.js';
import Vulnerability from '../src/models/Vulnerability.js';
import PipelineRun from '../src/models/PipelineRun.js';
import Alert from '../src/models/Alert.js';
import { encryptSecret, computeHmac } from '../src/utils/crypto.js';

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

describe('Module 4: Scan Ingestion & Webhook Pipeline Suite', () => {
  let adminUser;
  let adminToken;
  let testProject;
  const testKeyId = 'dso_live_test_pipeline_key';
  const testSecret = 'dso_sec_test_signing_secret_1234567890';

  beforeEach(async () => {
    await Vulnerability.deleteMany({});
    await PipelineRun.deleteMany({});
    await Alert.deleteMany({});
    await ApiKey.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    // Create Admin
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@pipeline.test',
      password: 'Password123!',
      role: 'Admin'
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pipeline.test', password: 'Password123!' });
    adminToken = loginRes.body.data.accessToken;

    // Create Project
    testProject = await Project.create({
      name: 'payment-service',
      key: 'PAY-SVC',
      criticality: 'Critical',
      gatePolicy: {
        failOnCritical: true,
        maxHighAllowed: 2
      }
    });

    // Create API Key
    await ApiKey.create({
      name: 'GitHub Actions Key',
      keyId: testKeyId,
      encryptedSecret: encryptSecret(testSecret),
      hashedSecret: crypto.createHash('sha256').update(testSecret).digest('hex'),
      createdBy: adminUser._id,
      autoCreateProject: true
    });
  });

  describe('Webhook Cryptographic Authentication (HMAC-SHA256)', () => {
    it('should reject webhook request missing X-API-Key or X-Signature with 401', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/scan')
        .send({ project: 'PAY-SVC', tool: 'trivy', report: {} });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject webhook request with invalid HMAC signature with 401', async () => {
      const payload = JSON.stringify({
        project: 'PAY-SVC',
        tool: 'trivy',
        report: { Results: [] }
      });

      const res = await request(app)
        .post('/api/v1/webhooks/scan')
        .set('X-API-Key', testKeyId)
        .set('X-Signature', 'sha256=invalid_hex_signature_1234567890abcdef')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid HMAC signature/i);
    });

    it('should accept webhook with valid HMAC signature and ingest findings', async () => {
      const rawPayload = JSON.stringify({
        project: 'PAY-SVC',
        tool: 'trivy',
        scanType: 'SCA',
        pipeline: {
          runId: 'gh-101',
          branch: 'main'
        },
        report: {
          Results: [
            {
              Target: 'package-lock.json',
              Vulnerabilities: [
                {
                  VulnerabilityID: 'CVE-2024-3094',
                  PkgName: 'xz-utils',
                  InstalledVersion: '5.6.0',
                  FixedVersion: '5.6.1',
                  Severity: 'CRITICAL',
                  Title: 'Upstream backdoor injection in liblzma'
                }
              ]
            }
          ]
        }
      });

      const signature = computeHmac(rawPayload, testSecret);

      const res = await request(app)
        .post('/api/v1/webhooks/scan')
        .set('X-API-Key', testKeyId)
        .set('X-Signature', `sha256=${signature}`)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.counts.critical).toBe(1);
      expect(res.body.data.gateResult.passed).toBe(false); // Failed gate due to critical vuln

      // Check DB
      const vuln = await Vulnerability.findOne({ cve: 'CVE-2024-3094' });
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('Critical');
      expect(vuln.component).toBe('xz-utils');

      // Check Alert was generated
      const alert = await Alert.findOne({ project: testProject._id });
      expect(alert).toBeDefined();
      expect(alert.category).toBe('Pipeline Gate Failure');
    });
  });

  describe('Deduplication & Finding Lifecycle', () => {
    it('should not duplicate findings on subsequent scans and should reopen resolved issues', async () => {
      const buildReport = () =>
        JSON.stringify({
          project: 'PAY-SVC',
          tool: 'trivy',
          scanType: 'SCA',
          pipeline: { runId: `run-${Date.now()}` },
          report: {
            Results: [
              {
                Target: 'app.js',
                Vulnerabilities: [
                  {
                    VulnerabilityID: 'CVE-2023-1111',
                    PkgName: 'express',
                    InstalledVersion: '4.17.0',
                    FixedVersion: '4.18.0',
                    Severity: 'HIGH',
                    Title: 'ReDoS in route path parser'
                  }
                ]
              }
            ]
          }
        });

      // Scan 1: Ingest
      const payload1 = buildReport();
      const sig1 = computeHmac(payload1, testSecret);
      await request(app)
        .post('/api/v1/webhooks/scan')
        .set('X-API-Key', testKeyId)
        .set('X-Signature', `sha256=${sig1}`)
        .set('Content-Type', 'application/json')
        .send(payload1);

      let vulns = await Vulnerability.find({ cve: 'CVE-2023-1111' });
      expect(vulns.length).toBe(1);
      expect(vulns[0].occurrences).toBe(1);

      // Scan 2: Ingest again (dedup check)
      const payload2 = buildReport();
      const sig2 = computeHmac(payload2, testSecret);
      const res2 = await request(app)
        .post('/api/v1/webhooks/scan')
        .set('X-API-Key', testKeyId)
        .set('X-Signature', `sha256=${sig2}`)
        .set('Content-Type', 'application/json')
        .send(payload2);

      expect(res2.body.data.summary.newFindings).toBe(0);
      expect(res2.body.data.summary.updatedFindings).toBe(1);

      vulns = await Vulnerability.find({ cve: 'CVE-2023-1111' });
      expect(vulns.length).toBe(1); // Still exactly 1
      expect(vulns[0].occurrences).toBe(2);

      // Mark as Resolved manually
      vulns[0].status = 'Resolved';
      vulns[0].resolvedAt = new Date();
      await vulns[0].save();

      // Scan 3: Finding reappears -> must be automatically reopened
      const payload3 = buildReport();
      const sig3 = computeHmac(payload3, testSecret);
      const res3 = await request(app)
        .post('/api/v1/webhooks/scan')
        .set('X-API-Key', testKeyId)
        .set('X-Signature', `sha256=${sig3}`)
        .set('Content-Type', 'application/json')
        .send(payload3);

      expect(res3.body.data.summary.reopenedFindings).toBe(1);

      const reopened = await Vulnerability.findOne({ cve: 'CVE-2023-1111' });
      expect(reopened.status).toBe('Open');
      expect(reopened.resolvedAt).toBeNull();
      const reopenTimeline = reopened.activityTimeline.find((a) => a.action === 'REOPENED');
      expect(reopenTimeline).toBeDefined();
    });
  });

  describe('Gitleaks Secret Redaction', () => {
    it('should ingest Gitleaks findings and NEVER store the plaintext secret', async () => {
      const sensitiveKey = 'AKIAIOSFODNN7EXAMPLE';
      const payload = JSON.stringify({
        project: 'PAY-SVC',
        tool: 'gitleaks',
        scanType: 'Secret',
        report: [
          {
            Description: 'AWS Access Key Token',
            RuleID: 'aws-access-token',
            File: 'config/aws.js',
            StartLine: 12,
            Secret: sensitiveKey
          }
        ]
      });

      const sig = computeHmac(payload, testSecret);
      const res = await request(app)
        .post('/api/v1/webhooks/scan')
        .set('X-API-Key', testKeyId)
        .set('X-Signature', `sha256=${sig}`)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);

      const secretFinding = await Vulnerability.findOne({ tool: 'gitleaks' });
      expect(secretFinding).toBeDefined();
      expect(secretFinding.severity).toBe('Critical');
      // Plain secret must not be stored anywhere in description or remediation
      expect(secretFinding.description.includes(sensitiveKey)).toBe(false);
      expect(secretFinding.description).toMatch(/AKIA\*\*\*\*/);
    });
  });

  describe('Manual Scan Report Upload', () => {
    it('should process multipart file upload for Security Analyst / Admin', async () => {
      const sampleBuffer = Buffer.from(
        JSON.stringify({
          Results: [
            {
              Target: 'Dockerfile',
              Vulnerabilities: [
                {
                  VulnerabilityID: 'CVE-2024-5555',
                  PkgName: 'curl',
                  InstalledVersion: '7.88.1',
                  FixedVersion: '7.88.2',
                  Severity: 'HIGH',
                  Title: 'Buffer overflow in curl HTTP/2'
                }
              ]
            }
          ]
        }),
        'utf8'
      );

      const res = await request(app)
        .post('/api/v1/scans/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project', testProject._id.toString())
        .field('tool', 'trivy')
        .field('scanType', 'Container')
        .attach('file', sampleBuffer, 'trivy-results.json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.newFindings).toBe(1);

      const vuln = await Vulnerability.findOne({ cve: 'CVE-2024-5555' });
      expect(vuln).toBeDefined();
      expect(vuln.scanType).toBe('Container');
    });
  });
});
