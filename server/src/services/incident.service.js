import Incident from '../models/Incident.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Vulnerability from '../models/Vulnerability.js';
import { logAudit } from '../utils/auditLogger.js';
import notificationService from './notification.service.js';

export class IncidentService {
  /**
   * Get paginated incidents with search and filters.
   */
  async getIncidents({ page = 1, limit = 20, search = '', status = '', severity = '', project = '' } = {}) {
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { incidentId: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (project) query.project = project;

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .populate('project', 'name key repository')
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      Incident.countDocuments(query)
    ]);

    return {
      incidents,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit)
      }
    };
  }

  /**
   * Get single incident by ID.
   */
  async getIncidentById(id) {
    const incident = await Incident.findById(id)
      .populate('project', 'name key repository')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('relatedVulnerabilities', 'title severity cve tool component status')
      .populate('timeline.performedBy', 'name email role')
      .lean();

    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    return incident;
  }

  /**
   * Create new security incident.
   */
  async createIncident(data, user, req) {
    const project = await Project.findById(data.project);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const incidentId = `INC-${Date.now().toString().slice(-4)}${randomSuffix}`;

    const timelineEntry = {
      action: 'Incident Created',
      notes: data.notes || 'Incident registered into security response queue',
      performedBy: user._id,
      performedByName: user.name,
      timestamp: new Date()
    };

    const incident = await Incident.create({
      incidentId,
      title: data.title,
      description: data.description,
      severity: data.severity || 'High',
      status: data.status || 'Detected',
      project: project._id,
      assignedTo: data.assignedTo || null,
      relatedVulnerabilities: data.relatedVulnerabilities || [],
      timeline: [timelineEntry],
      createdBy: user._id
    });

    await logAudit({
      action: 'INCIDENT_CREATED',
      req,
      performedBy: user,
      targetResource: 'Incident',
      targetId: incident._id,
      details: {
        incidentId: incident.incidentId,
        severity: incident.severity,
        project: project.name
      }
    });

    if (data.assignedTo) {
      await notificationService.createNotification({
        userId: data.assignedTo,
        type: 'INCIDENT_ASSIGNED',
        title: `Assigned to Incident [${incident.incidentId}]`,
        message: `You were assigned to resolve incident: "${incident.title}" (${incident.severity})`,
        severity: incident.severity === 'Critical' ? 'Critical' : 'High',
        link: `/incidents?id=${incident._id}`
      });
    }

    return incident;
  }

  /**
   * Advance or update incident status.
   */
  async updateStatus(id, { status, notes }, user, req) {
    const incident = await Incident.findById(id);
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = incident.status;
    incident.status = status;
    if (status === 'Resolved' && !incident.resolvedAt) {
      incident.resolvedAt = new Date();
    }

    incident.timeline.push({
      action: `Status transitioned: ${previousStatus} -> ${status}`,
      notes: notes || '',
      performedBy: user._id,
      performedByName: user.name,
      timestamp: new Date()
    });

    await incident.save();

    await logAudit({
      action: 'INCIDENT_STATUS_CHANGE',
      req,
      performedBy: user,
      targetResource: 'Incident',
      targetId: incident._id,
      details: {
        incidentId: incident.incidentId,
        fromStatus: previousStatus,
        toStatus: status,
        notes
      }
    });

    if (incident.assignedTo && incident.assignedTo.toString() !== user._id.toString()) {
      await notificationService.createNotification({
        userId: incident.assignedTo,
        type: 'INCIDENT_STATUS_CHANGE',
        title: `Incident [${incident.incidentId}] Status Updated`,
        message: `Incident "${incident.title}" transitioned to ${status}`,
        severity: 'Info',
        link: `/incidents?id=${incident._id}`
      });
    }

    return incident;
  }

  /**
   * Reassign incident.
   */
  async assignIncident(id, { assignedTo }, user, req) {
    const incident = await Incident.findById(id);
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    let assigneeName = 'Unassigned';
    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      if (assignee) assigneeName = assignee.name;
    }

    incident.assignedTo = assignedTo || null;
    incident.timeline.push({
      action: `Assigned to ${assigneeName}`,
      notes: `Reassigned by ${user.name}`,
      performedBy: user._id,
      performedByName: user.name,
      timestamp: new Date()
    });

    await incident.save();

    await logAudit({
      action: 'INCIDENT_ASSIGNED',
      req,
      performedBy: user,
      targetResource: 'Incident',
      targetId: incident._id,
      details: {
        incidentId: incident.incidentId,
        assignedTo,
        assigneeName
      }
    });

    if (assignedTo) {
      await notificationService.createNotification({
        userId: assignedTo,
        type: 'INCIDENT_ASSIGNED',
        title: `Assigned to Incident [${incident.incidentId}]`,
        message: `You were assigned to incident: "${incident.title}"`,
        severity: incident.severity === 'Critical' ? 'Critical' : 'High',
        link: `/incidents?id=${incident._id}`
      });
    }

    return incident;
  }

  /**
   * Update post-mortem report.
   */
  async updatePostMortem(id, postMortemData, user, req) {
    const incident = await Incident.findById(id);
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    incident.postMortem = {
      rootCause: postMortemData.rootCause || incident.postMortem?.rootCause || '',
      impactSummary: postMortemData.impactSummary || incident.postMortem?.impactSummary || '',
      preventativeActions: postMortemData.preventativeActions || incident.postMortem?.preventativeActions || '',
      completedAt: new Date()
    };

    incident.timeline.push({
      action: 'Post-Mortem Analysis Recorded',
      notes: 'Root cause analysis and preventative actions documented',
      performedBy: user._id,
      performedByName: user.name,
      timestamp: new Date()
    });

    await incident.save();

    await logAudit({
      action: 'INCIDENT_POSTMORTEM_SAVED',
      req,
      performedBy: user,
      targetResource: 'Incident',
      targetId: incident._id,
      details: { incidentId: incident.incidentId }
    });

    return incident;
  }
}

export const incidentService = new IncidentService();
export default incidentService;
