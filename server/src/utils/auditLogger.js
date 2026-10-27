import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

/**
 * Record an immutable audit log entry.
 */
export const logAudit = async ({
  action,
  req = null,
  performedBy = null,
  targetResource = '',
  targetId = '',
  details = {},
  beforeState = null,
  afterState = null
}) => {
  try {
    let userObj = performedBy;
    let ipAddress = '127.0.0.1';
    let userAgent = 'System';

    if (req) {
      userObj = userObj || req.user;
      ipAddress =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        '127.0.0.1';
      userAgent = req.headers['user-agent'] || 'Unknown';
    }

    await AuditLog.create({
      action,
      performedBy: userObj?._id || null,
      performedByName: userObj?.name || 'System',
      performedByEmail: userObj?.email || '',
      role: userObj?.role || 'System',
      targetResource,
      targetId: String(targetId || ''),
      details,
      beforeState,
      afterState,
      ipAddress,
      userAgent
    });

    logger.debug(`[AUDIT] Action: ${action} | Resource: ${targetResource} | By: ${userObj?.name || 'System'}`);
  } catch (err) {
    logger.error(`Failed to record audit log: ${err.message}`);
  }
};

export default {
  logAudit
};
