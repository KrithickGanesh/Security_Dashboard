import cron from 'node-cron';
import Vulnerability from '../models/Vulnerability.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import notificationService from '../services/notification.service.js';
import logger from '../utils/logger.js';

/**
 * Scan database for SLA breaches and upcoming SLA deadlines.
 */
export const checkSlaBreachesNow = async () => {
  logger.info('Running SLA Compliance & Breach Check Job...');
  const now = new Date();

  try {
    // 1. Identify breached vulnerabilities that haven't had an SLA alert raised yet
    const breachedVulns = await Vulnerability.find({
      slaDueDate: { $lte: now },
      status: { $in: ['Open', 'In Progress'] }
    })
      .populate('project', 'name key assignedTeam')
      .populate('assignee', 'name email notificationPreferences');

    let newBreachesCount = 0;

    for (const vuln of breachedVulns) {
      // Check if an SLA breach alert was already dispatched for this vulnerability
      const existingAlert = await Alert.findOne({
        vulnerability: vuln._id,
        category: 'SLA Breach'
      });

      if (existingAlert) {
        continue;
      }

      vuln.slaBreached = true;
      vuln.activityTimeline.push({
        action: 'SLA_BREACHED',
        details: `Remediation SLA expired on ${new Date(vuln.slaDueDate).toLocaleDateString()}`,
        timestamp: new Date()
      });
      await vuln.save();

      // Raise system alert
      await Alert.create({
        title: `Remediation SLA Breached: ${vuln.cve || vuln.title}`,
        message: `${vuln.severity} finding in project '${vuln.project?.name}' has breached its SLA remediation deadline.`,
        severity: vuln.severity === 'Critical' ? 'Critical' : 'High',
        category: 'SLA Breach',
        project: vuln.project?._id,
        vulnerability: vuln._id
      });

      // Notify Assignee or Project Team
      const targetUsers = [];
      if (vuln.assignee) {
        targetUsers.push(vuln.assignee._id);
      } else if (vuln.project?.assignedTeam?.length > 0) {
        targetUsers.push(...vuln.project.assignedTeam);
      } else {
        // Fallback: Notify Admins
        const admins = await User.find({ role: 'Admin' }).select('_id');
        targetUsers.push(...admins.map((a) => a._id));
      }

      await notificationService.notifyUsers(targetUsers, {
        type: 'SLA_BREACH',
        title: `SLA Breached: ${vuln.cve || vuln.title}`,
        message: `Vulnerability ${vuln.cve || vuln.title} (${vuln.severity}) in ${vuln.project?.name} has exceeded its SLA remediation window.`,
        severity: 'Critical',
        link: `/vulnerabilities?search=${vuln.cve || vuln.title}`,
        sendEmailAlert: true
      });

      newBreachesCount++;
      logger.warn(`SLA Breach recorded for ${vuln.cve || vuln.title} in project ${vuln.project?.name}`);
    }

    // 2. Identify vulnerabilities approaching SLA deadline (within 24 hours)
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nearBreachVulns = await Vulnerability.find({
      slaDueDate: { $gt: now, $lte: in24Hours },
      status: { $in: ['Open', 'In Progress'] }
    })
      .populate('project', 'name key')
      .populate('assignee', 'name email');

    for (const vuln of nearBreachVulns) {
      if (vuln.assignee) {
        await notificationService.createNotification({
          userId: vuln.assignee._id,
          type: 'SLA_NEAR_BREACH',
          title: `SLA Near Breach: ${vuln.cve || vuln.title}`,
          message: `Finding ${vuln.cve || vuln.title} is due for remediation within 24 hours.`,
          severity: 'High',
          link: `/vulnerabilities?search=${vuln.cve || vuln.title}`
        });
      }
    }

    logger.info(
      `SLA Check complete. Processed ${newBreachesCount} new breaches and ${nearBreachVulns.length} near-breach warnings.`
    );
    return {
      newBreaches: newBreachesCount,
      nearBreaches: nearBreachVulns.length
    };
  } catch (error) {
    logger.error(`Error executing SLA cron job: ${error.message}`);
    throw error;
  }
};

/**
 * Schedule hourly SLA compliance job using node-cron.
 */
export const startSlaCronJob = () => {
  // Run every hour at minute 0
  const job = cron.schedule('0 * * * *', async () => {
    await checkSlaBreachesNow();
  });

  logger.info('Hourly SLA Monitoring Cron Job scheduled (0 * * * *)');
  return job;
};

export default {
  startSlaCronJob,
  checkSlaBreachesNow
};
