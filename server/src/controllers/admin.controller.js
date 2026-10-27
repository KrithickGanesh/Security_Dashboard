import adminService from '../services/admin.service.js';

export class AdminController {
  /**
   * Get paginated user directory.
   */
  async getUsers(req, res, next) {
    try {
      const data = await adminService.getUsers(req.query);
      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin user creation.
   */
  async createUser(req, res, next) {
    try {
      const user = await adminService.createUser(req.body, req.user, req);
      res.status(201).json({
        success: true,
        message: 'User account created successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user details and role.
   */
  async updateUser(req, res, next) {
    try {
      const user = await adminService.updateUser(req.params.id, req.body, req.user, req);
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user permanently or soft-delete.
   */
  async deleteUser(req, res, next) {
    try {
      const result = await adminService.deleteUser(req.params.id, req.user, req);
      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlock user account.
   */
  async unlockUser(req, res, next) {
    try {
      const result = await adminService.unlockUser(req.params.id, req.user, req);
      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invalidate all refresh tokens for a user.
   */
  async forceLogout(req, res, next) {
    try {
      const result = await adminService.forceLogout(req.params.id, req.user, req);
      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin dashboard & health metrics.
   */
  async getDashboardStats(req, res, next) {
    try {
      const stats = await adminService.getAdminDashboardStats();
      res.status(200).json({
        success: true,
        message: 'Admin metrics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List API Keys.
   */
  async getApiKeys(req, res, next) {
    try {
      const keys = await adminService.getApiKeys();
      res.status(200).json({
        success: true,
        message: 'API Keys retrieved successfully',
        data: keys
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create an API Key.
   */
  async createApiKey(req, res, next) {
    try {
      const result = await adminService.createApiKey(req.body, req.user, req);
      res.status(201).json({
        success: true,
        message: 'API Key generated. Secret is presented only once.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke an API Key.
   */
  async revokeApiKey(req, res, next) {
    try {
      const apiKey = await adminService.revokeApiKey(req.params.id, req.user, req);
      res.status(200).json({
        success: true,
        message: 'API Key revoked successfully',
        data: apiKey
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get immutable audit logs.
   */
  async getAuditLogs(req, res, next) {
    try {
      const data = await adminService.getAuditLogs(req.query);
      res.status(200).json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export audit logs to CSV.
   */
  async exportAuditLogsCsv(req, res, next) {
    try {
      const csv = await adminService.exportAuditLogsCsv(req.query);
      res.header('Content-Type', 'text/csv');
      res.attachment(`audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system settings.
   */
  async getSettings(req, res, next) {
    try {
      const settings = await adminService.getSettings();
      res.status(200).json({
        success: true,
        message: 'System settings retrieved successfully',
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update system settings.
   */
  async updateSettings(req, res, next) {
    try {
      const settings = await adminService.updateSettings(req.body, req.user, req);
      res.status(200).json({
        success: true,
        message: 'System settings updated successfully',
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
export default adminController;
