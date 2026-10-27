import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import Alert from '../src/models/Alert.js';
import Project from '../src/models/Project.js';
import Vulnerability from '../src/models/Vulnerability.js';
import { checkSlaBreachesNow } from '../src/jobs/slaCron.js';

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

describe('Module 6: Notifications, Live Alerts & SLA Cron Suite', () => {
  let userToken;
  let testUser;

  beforeEach(async () => {
    await Notification.deleteMany({});
    await Alert.deleteMany({});
    await Vulnerability.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      name: 'Dev User',
      email: 'dev@notif.test',
      password: 'Password123!',
      role: 'Developer'
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dev@notif.test', password: 'Password123!' });
    userToken = loginRes.body.data.accessToken;
  });

  describe('Notification Management Endpoints', () => {
    it('should list user notifications and calculate unread count', async () => {
      await Notification.create([
        {
          user: testUser._id,
          type: 'CRITICAL_VULNERABILITY',
          title: 'Critical CVE Discovered',
          message: 'CVE-2024-3094 detected in upstream library.',
          severity: 'Critical',
          isRead: false
        },
        {
          user: testUser._id,
          type: 'PIPELINE_GATE_FAILED',
          title: 'Security Gate Failed',
          message: 'Branch main failed security policy.',
          severity: 'High',
          isRead: true
        }
      ]);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications.length).toBe(2);
      expect(res.body.data.unreadCount).toBe(1);
    });

    it('should mark single and all notifications as read', async () => {
      const notif = await Notification.create({
        user: testUser._id,
        type: 'VULNERABILITY_ASSIGNED',
        title: 'Assigned to Vulnerability',
        message: 'You have been assigned to remediate VULN-101',
        isRead: false
      });

      // Mark single read
      const markRes = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(markRes.status).toBe(200);
      expect(markRes.body.data.notification.isRead).toBe(true);

      // Create another unread
      await Notification.create({
        user: testUser._id,
        type: 'SLA_NEAR_BREACH',
        title: 'SLA Warning',
        message: 'Approaching deadline',
        isRead: false
      });

      // Mark all read
      const allRes = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(allRes.status).toBe(200);

      const unreadCount = await Notification.countDocuments({
        user: testUser._id,
        isRead: false
      });
      expect(unreadCount).toBe(0);
    });

    it('should delete a notification', async () => {
      const notif = await Notification.create({
        user: testUser._id,
        type: 'INFO',
        title: 'Test Info',
        message: 'Test description'
      });

      const delRes = await request(app)
        .delete(`/api/v1/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(delRes.status).toBe(200);
      const exists = await Notification.findById(notif._id);
      expect(exists).toBeNull();
    });
  });

  describe('Alerts and SLA Breach Detection Job', () => {
    it('should detect expired SLA and raise system alert plus user notification', async () => {
      const project = await Project.create({
        name: 'auth-service',
        key: 'AUTH-SVC',
        criticality: 'High',
        assignedTeam: [testUser._id]
      });

      // Create finding with SLA due date in the past
      const pastDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const vuln = await Vulnerability.create({
        fingerprint: 'fp-sla-001',
        project: project._id,
        title: 'Severe Memory Corruption in Parser',
        severity: 'Critical',
        status: 'Open',
        tool: 'trivy',
        scanType: 'SCA',
        assignee: testUser._id,
        slaDueDate: pastDueDate,
        slaBreached: false
      });

      // Execute SLA cron check
      const result = await checkSlaBreachesNow();
      expect(result.newBreaches).toBeGreaterThanOrEqual(1);

      // Vulnerability should now be marked slaBreached: true
      const updatedVuln = await Vulnerability.findById(vuln._id);
      expect(updatedVuln.slaBreached).toBe(true);
      const breachActivity = updatedVuln.activityTimeline.find(
        (a) => a.action === 'SLA_BREACHED'
      );
      expect(breachActivity).toBeDefined();

      // System alert should be created
      const alert = await Alert.findOne({ vulnerability: vuln._id });
      expect(alert).toBeDefined();
      expect(alert.category).toBe('SLA Breach');

      // Notification should be delivered to the assignee
      const notif = await Notification.findOne({
        user: testUser._id,
        type: 'SLA_BREACH'
      });
      expect(notif).toBeDefined();
    });
  });
});
