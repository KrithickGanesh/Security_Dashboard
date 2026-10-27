import Project from '../models/Project.js';
import Vulnerability from '../models/Vulnerability.js';

export class ProjectService {
  /**
   * List projects with pagination, search, criticality filtering, and vulnerability counts.
   */
  async getProjects({
    page = 1,
    limit = 10,
    search = '',
    criticality = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (criticality) {
      query.criticality = criticality;
    }

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('assignedTeam', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      Project.countDocuments(query)
    ]);

    // Aggregate active vulnerability counts per project
    const projectIds = projects.map((p) => p._id);
    const vulnCounts = await Vulnerability.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          status: { $in: ['Open', 'In Progress'] }
        }
      },
      {
        $group: {
          _id: { project: '$project', severity: '$severity' },
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    vulnCounts.forEach((vc) => {
      const pid = vc._id.project.toString();
      if (!countMap[pid]) {
        countMap[pid] = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, total: 0 };
      }
      countMap[pid][vc._id.severity] = vc.count;
      countMap[pid].total += vc.count;
    });

    const enrichedProjects = projects.map((p) => ({
      ...p,
      vulnerabilityCounts: countMap[p._id.toString()] || {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        Info: 0,
        total: 0
      }
    }));

    return {
      projects: enrichedProjects,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit)
      }
    };
  }

  /**
   * Get single project by ID with stats
   */
  async getProjectById(id) {
    const project = await Project.findById(id).populate('assignedTeam', 'name email role');
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    const [vulnStats, totalRuns] = await Promise.all([
      Vulnerability.aggregate([
        { $match: { project: project._id } },
        {
          $group: {
            _id: { severity: '$severity', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ]),
      // We will count pipeline runs later if collection exists, fallback 0
      0
    ]);

    return {
      project,
      stats: {
        vulnBreakdown: vulnStats,
        pipelineRunsCount: totalRuns
      }
    };
  }

  /**
   * Create new project
   */
  async createProject(data, userId) {
    const existing = await Project.findOne({
      $or: [{ name: data.name }, { key: data.key.toUpperCase() }]
    });

    if (existing) {
      const error = new Error('A project with this name or key already exists.');
      error.statusCode = 409;
      throw error;
    }

    const project = await Project.create({
      ...data,
      key: data.key.toUpperCase(),
      assignedTeam: data.assignedTeam || [userId]
    });

    return project;
  }

  /**
   * Update existing project
   */
  async updateProject(id, data) {
    const project = await Project.findById(id);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (data.key && data.key.toUpperCase() !== project.key) {
      const duplicateKey = await Project.findOne({
        key: data.key.toUpperCase(),
        _id: { $ne: id }
      });
      if (duplicateKey) {
        const error = new Error('Project key is already in use by another project.');
        error.statusCode = 409;
        throw error;
      }
      project.key = data.key.toUpperCase();
    }

    if (data.name) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.repositoryUrl !== undefined) project.repositoryUrl = data.repositoryUrl;
    if (data.criticality) project.criticality = data.criticality;
    if (data.assignedTeam) project.assignedTeam = data.assignedTeam;
    if (data.gatePolicy) project.gatePolicy = { ...project.gatePolicy, ...data.gatePolicy };
    if (data.autoResolveMissing !== undefined) project.autoResolveMissing = data.autoResolveMissing;

    await project.save();
    return project;
  }

  /**
   * Delete project and cascade delete its vulnerabilities
   */
  async deleteProject(id) {
    const project = await Project.findById(id);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    await Vulnerability.deleteMany({ project: id });
    await Project.findByIdAndDelete(id);

    return { message: 'Project and associated vulnerabilities deleted successfully.' };
  }
}

export const projectService = new ProjectService();
export default projectService;
