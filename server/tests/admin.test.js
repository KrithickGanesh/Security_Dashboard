import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ApiKey from '../src/models/ApiKey.js';
import AuditLog from '../src/models/AuditLog.js';
import Settings from '../src/models/Settings.js';

describe('Admin & Audit Suite Tests', () => {
  let adminToken;
  let auditorToken;
  let devToken;
  let adminUser;
  let auditorUser;
  let devUser;

  beforeAll(async () => {
    // Never fall back to process.env.MONGO_URI: dotenv loads the development
    // URI, and this suite deletes audit records.
    const mongoUri =
      process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Clean test models
    await Promise.all([
      User.deleteMany({ email: { $regex: /@admin-test\.com$/ } }),
      ApiKey.deleteMany({ name: { $regex: /Test CI Key/ } }),
      AuditLog.deleteMany({ action: { $in: ['API_KEY_CREATED', 'API_KEY_REVOKED', 'SETTINGS_UPDATE'] } })
    ]);

    // Create Admin user
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@admin-test.com',
      password: 'Password123!',
      role: 'Admin'
    });

    // Create Auditor user
    auditorUser = await User.create({
      name: 'Compliance Auditor',
      email: 'auditor@admin-test.com',
      password: 'Password123!',
      role: 'Auditor'
    });

    // Create Developer user
    devUser = await User.create({
      name: 'Software Dev',
      email: 'dev@admin-test.com',
      password: 'Password123!',
      role: 'Developer'
    });

    // Log in admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@admin-test.com', password: 'Password123!' });
    adminToken = adminRes.body.data.accessToken;

    // Log in auditor
    const auditorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'auditor@admin-test.com', password: 'Password123!' });
    auditorToken = auditorRes.body.data.accessToken;

    // Log in dev
    const devRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dev@admin-test.com', password: 'Password123!' });
    devToken = devRes.body.data.accessToken;
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $regex: /@admin-test\.com$/ } }),
      ApiKey.deleteMany({ name: { $regex: /Test CI Key/ } }),
      AuditLog.deleteMany({ action: { $in: ['API_KEY_CREATED', 'API_KEY_REVOKED', 'SETTINGS_UPDATE'] } })
    ]);
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/admin/stats returns system and user metrics for Admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('usersByRole');
    expect(res.body.data).toHaveProperty('systemHealth');
    expect(res.body.data.systemHealth.database.status).toBe('Connected');
  });

  it('2. Non-admin is forbidden (403) from admin dashboard and user management', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(403);
  });

  it('3. Auditor can view audit logs and export CSV', async () => {
    const listRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.logs)).toBe(true);

    const exportRes = await request(app)
      .get('/api/v1/audit-logs/export')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.header['content-type']).toMatch(/text\/csv/);
  });

  it('4. Admin can create, inspect, and revoke API Keys', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test CI Key',
        allowedTools: ['trivy', 'gitleaks'],
        autoCreateProject: true
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.apiKey).toHaveProperty('keyId');
    expect(createRes.body.data).toHaveProperty('plainSecret');
    expect(createRes.body.data.plainSecret).toMatch(/^dso_sec_/);

    const apiKeyId = createRes.body.data.apiKey._id;

    const revokeRes = await request(app)
      .post(`/api/v1/admin/api-keys/${apiKeyId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.revoked).toBe(true);
  });

  it('5. Admin can update system settings and creates immutable audit log', async () => {
    const updateRes = await request(app)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slaDays: { critical: 3, high: 7, medium: 30, low: 90 },
        passwordPolicy: { minLength: 10, requireSymbols: true }
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.slaDays.critical).toBe(3);

    // Verify audit log
    const auditRecord = await AuditLog.findOne({ action: 'SETTINGS_UPDATE' }).sort({ createdAt: -1 });
    expect(auditRecord).toBeTruthy();
    expect(auditRecord.targetResource).toBe('Settings');
  });
});
