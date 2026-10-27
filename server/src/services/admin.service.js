import crypto from 'crypto';
import mongoose from 'mongoose';
import { Parser } from 'json2csv';
import User from '../models/User.js';
import ApiKey from '../models/ApiKey.js';
import AuditLog from '../models/AuditLog.js';
import Settings from '../models/Settings.js';
import { encryptSecret } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLogger.js';

export class AdminService {
  /**
   * List users with search, role filtering, and pagination.
   */
  async getUsers({ page = 1, limit = 15, search = '', role = '', isActive = null } = {}) {
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== null && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('+lockUntil +failedLoginAttempts')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      User.countDocuments(query)
    ]);

    const enriched = users.map((u) => ({
      ...u,
      isLocked: !!(u.lockUntil && new Date(u.lockUntil) > new Date())
    }));

    return {
      users: enriched,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit)
      }
    };
  }

  /**
   * Create user as administrator.
   */
  async createUser(data, adminUser, req) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      const error = new Error('An account with this email already exists.');
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'Developer'
    });

    await logAudit({
      action: 'USER_CREATED',
      req,
      performedBy: adminUser,
      targetResource: 'User',
      targetId: user._id,
      details: { email: user.email, role: user.role }
    });

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  /**
   * Update user details and role.
   */
  async updateUser(id, data, adminUser, req) {
    const user = await User.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    if (data.name) user.name = data.name.trim();
    if (data.email) user.email = data.email.toLowerCase().trim();
    if (data.role) user.role = data.role;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    await user.save();

    const afterState = {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    const isRoleChange = beforeState.role !== afterState.role;
    await logAudit({
      action: isRoleChange ? 'ROLE_CHANGE' : 'USER_UPDATED',
      req,
      performedBy: adminUser,
      targetResource: 'User',
      targetId: user._id,
      details: isRoleChange
        ? { previousRole: beforeState.role, newRole: afterState.role }
        : { updatedFields: Object.keys(data) },
      beforeState,
      afterState
    });

    return user;
  }

  /**
   * Unlock account locked due to failed login attempts.
   */
  async unlockUser(id, adminUser, req) {
    const user = await User.findById(id).select('+lockUntil +failedLoginAttempts');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await logAudit({
      action: 'ACCOUNT_UNLOCKED',
      req,
      performedBy: adminUser,
      targetResource: 'User',
      targetId: user._id,
      details: { email: user.email }
    });

    return { message: `Account for ${user.email} has been unlocked.` };
  }

  /**
   * Invalidate user session across all devices.
   */
  async forceLogout(id, adminUser, req) {
    const user = await User.findByIdAndUpdate(id, { refreshToken: null });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    await logAudit({
      action: 'FORCE_LOGOUT',
      req,
      performedBy: adminUser,
      targetResource: 'User',
      targetId: user._id,
      details: { email: user.email }
    });

    return { message: `Forced session logout for ${user.email}.` };
  }

  /**
   * Soft delete or deactivate user.
   */
  async deleteUser(id, adminUser, req) {
    if (id === adminUser._id.toString()) {
      const error = new Error('Administrators cannot delete their own active account.');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    await logAudit({
      action: 'USER_DELETED',
      req,
      performedBy: adminUser,
      targetResource: 'User',
      targetId: id,
      details: { email: user.email, name: user.name }
    });

    return { message: `User ${user.email} removed permanently.` };
  }

  /**
   * Admin Executive Dashboard metrics & health inspection.
   */
  async getAdminDashboardStats() {
    const [roleCounts, totalUsers, activeUsers, lockedUsers, recentLogins] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      User.find({ lastLogin: { $ne: null } })
        .sort({ lastLogin: -1 })
        .limit(8)
        .select('name email role lastLogin')
        .lean()
    ]);

    const usersByRole = {
      Admin: 0,
      'Security Analyst': 0,
      Developer: 0,
      Auditor: 0
    };
    roleCounts.forEach((r) => {
      if (usersByRole[r._id] !== undefined) usersByRole[r._id] = r.count;
    });

    const dbState = mongoose.connection.readyState;
    const dbStatus =
      dbState === 1
        ? 'Connected'
        : dbState === 2
        ? 'Connecting'
        : 'Disconnected';

    const memoryUsage = process.memoryUsage();

    return {
      usersByRole,
      totalUsers,
      activeUsers,
      lockedUsers,
      recentLogins,
      systemHealth: {
        database: {
          status: dbStatus,
          host: mongoose.connection.host || '127.0.0.1',
          name: mongoose.connection.name || 'devsecops_dashboard'
        },
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        memoryMB: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        }
      }
    };
  }

  /**
   * List API keys.
   */
  async getApiKeys() {
    return ApiKey.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Provision new API Key with plain secret shown only once.
   */
  async createApiKey(data, adminUser, req) {
    const keyId = `dso_live_${crypto.randomBytes(16).toString('hex')}`;
    const plainSecret = `dso_sec_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = await ApiKey.create({
      name: data.name || 'CI Webhook Key',
      keyId,
      encryptedSecret: encryptSecret(plainSecret),
      hashedSecret: crypto.createHash('sha256').update(plainSecret).digest('hex'),
      allowedTools: data.allowedTools || ['trivy', 'gitleaks', 'npm-audit', 'semgrep'],
      autoCreateProject: !!data.autoCreateProject,
      createdBy: adminUser._id
    });

    await logAudit({
      action: 'API_KEY_CREATED',
      req,
      performedBy: adminUser,
      targetResource: 'ApiKey',
      targetId: apiKey._id,
      details: { name: apiKey.name, keyId }
    });

    const apiKeyObj = apiKey.toObject();
    delete apiKeyObj.encryptedSecret;
    delete apiKeyObj.hashedSecret;

    return {
      apiKey: apiKeyObj,
      plainSecret // Returned strictly once upon creation!
    };
  }

  /**
   * Revoke API Key.
   */
  async revokeApiKey(id, adminUser, req) {
    const apiKey = await ApiKey.findByIdAndUpdate(
      id,
      { revoked: true, revokedAt: new Date() },
      { new: true }
    );
    if (!apiKey) {
      const error = new Error('API key not found');
      error.statusCode = 404;
      throw error;
    }

    await logAudit({
      action: 'API_KEY_REVOKED',
      req,
      performedBy: adminUser,
      targetResource: 'ApiKey',
      targetId: id,
      details: { keyId: apiKey.keyId }
    });

    return apiKey;
  }

  /**
   * Get filterable audit logs.
   */
  async getAuditLogs({ page = 1, limit = 20, search = '', action = '', role = '' } = {}) {
    const query = {};

    if (search) {
      query.$or = [
        { performedByName: { $regex: search, $options: 'i' } },
        { performedByEmail: { $regex: search, $options: 'i' } },
        { targetResource: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }

    if (action) query.action = action;
    if (role) query.role = role;

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit).lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit)
      }
    };
  }

  /**
   * Export audit logs as CSV dataset.
   */
  async exportAuditLogsCsv({ search = '', action = '', role = '' } = {}) {
    const query = {};

    if (search) {
      query.$or = [
        { performedByName: { $regex: search, $options: 'i' } },
        { performedByEmail: { $regex: search, $options: 'i' } },
        { targetResource: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }

    if (action) query.action = action;
    if (role) query.role = role;

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(1000).lean();

    const fields = [
      { label: 'Timestamp', value: 'createdAt' },
      { label: 'Action', value: 'action' },
      { label: 'User Name', value: 'performedByName' },
      { label: 'User Email', value: 'performedByEmail' },
      { label: 'Role', value: 'role' },
      { label: 'Target Resource', value: 'targetResource' },
      { label: 'Target ID', value: 'targetId' },
      { label: 'IP Address', value: 'ipAddress' }
    ];

    const parser = new Parser({ fields });
    return parser.parse(logs);
  }

  /**
   * Get system settings.
   */
  async getSettings() {
    let settings = await Settings.findOne({ key: 'system_config' });
    if (!settings) {
      settings = await Settings.create({ key: 'system_config' });
    }
    return settings;
  }

  /**
   * Update system settings.
   */
  async updateSettings(data, adminUser, req) {
    let settings = await Settings.findOne({ key: 'system_config' });
    if (!settings) {
      settings = await Settings.create({ key: 'system_config' });
    }

    const beforeState = settings.toObject();

    if (data.slaDays) settings.slaDays = { ...settings.slaDays, ...data.slaDays };
    if (data.gatePolicyDefaults) {
      settings.gatePolicyDefaults = { ...settings.gatePolicyDefaults, ...data.gatePolicyDefaults };
    }
    if (data.passwordPolicy) {
      settings.passwordPolicy = { ...settings.passwordPolicy, ...data.passwordPolicy };
    }
    if (data.emailNotifications) {
      settings.emailNotifications = { ...settings.emailNotifications, ...data.emailNotifications };
    }

    await settings.save();

    await logAudit({
      action: 'SETTINGS_UPDATE',
      req,
      performedBy: adminUser,
      targetResource: 'Settings',
      targetId: 'system_config',
      details: { updatedSections: Object.keys(data) },
      beforeState,
      afterState: settings.toObject()
    });

    return settings;
  }
}

export const adminService = new AdminService();
export default adminService;
