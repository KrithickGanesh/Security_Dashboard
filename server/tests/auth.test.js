import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_test_db';

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Module 1: Authentication & RBAC Suite', () => {
  const validUser = {
    name: 'Alice SecDev',
    email: 'alice@devsecops.test',
    password: 'Password123!',
    confirmPassword: 'Password123!'
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with Developer role by default', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@devsecops.test');
      expect(res.body.data.user.role).toBe('Developer');
      expect(res.body.data.accessToken).toBeDefined();

      // Check cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);

      // Verify in DB that password is encrypted and not plain
      const saved = await User.findOne({ email: 'alice@devsecops.test' }).select('+password +refreshToken');
      expect(saved.password).not.toBe('Password123!');
      expect(saved.password.startsWith('$2')).toBe(true); // bcrypt hash
      expect(saved.refreshToken).toBeDefined();
    });

    it('should reject registration if password does not meet complexity requirements', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Weak Pass',
          email: 'weak@devsecops.test',
          password: 'password', // Missing upper, number, symbol
          confirmPassword: 'password'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject registration with mismatched confirmPassword', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          confirmPassword: 'DifferentPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login and Account Lockout', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('should log in successfully with valid credentials and return access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should track failed attempts and lock out user after 5 consecutive failures', async () => {
      // 4 wrong attempts
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: 'WrongPassword123!'
          });
        expect(res.status).toBe(401);
      }

      // Check DB after 4 failed attempts
      let user = await User.findOne({ email: validUser.email });
      expect(user.failedLoginAttempts).toBe(4);
      expect(user.isLocked()).toBe(false);

      // 5th wrong attempt -> Account locked
      const lockRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword123!'
        });

      expect(lockRes.status).toBe(401);

      user = await User.findOne({ email: validUser.email });
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockUntil).toBeDefined();
      expect(user.isLocked()).toBe(true);

      // Subsequent attempt even with correct password is rejected with 423 Locked
      const lockedAttempt = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(lockedAttempt.status).toBe(423);
      expect(lockedAttempt.body.message).toMatch(/Account locked/i);
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate refresh token and issue a new pair', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUser);
      const cookieHeader = reg.headers['set-cookie'][0];
      const tokenMatch = cookieHeader.match(/refreshToken=([^;]+)/);
      const originalRefreshToken = tokenMatch[1];

      // Request token refresh using cookie
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${originalRefreshToken}`]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const newCookie = refreshRes.headers['set-cookie'][0];
      const newTokenMatch = newCookie.match(/refreshToken=([^;]+)/);
      const newRefreshToken = newTokenMatch[1];

      // Ensure rotated token is different from old token
      expect(newRefreshToken).not.toBe(originalRefreshToken);

      // Old token must no longer be valid
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${originalRefreshToken}`]);

      expect(replayRes.status).toBe(401);
    });
  });

  describe('Protected Routes & RBAC Enforcement', () => {
    let accessToken;
    let devUser;

    beforeEach(async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUser);
      accessToken = reg.body.data.accessToken;
      devUser = reg.body.data.user;
    });

    it('should deny access to /me without token with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should allow access to /me with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('should invalidate token session on logout', async () => {
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);

      // DB refresh token is now null
      const user = await User.findById(devUser.id || devUser._id).select('+refreshToken');
      expect(user.refreshToken).toBeNull();
    });
  });
});
