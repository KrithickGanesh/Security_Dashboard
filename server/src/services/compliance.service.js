import Framework from '../models/Framework.js';
import Control from '../models/Control.js';
import Assessment from '../models/Assessment.js';
import Vulnerability from '../models/Vulnerability.js';
import Project from '../models/Project.js';
import logger from '../utils/logger.js';

export class ComplianceService {
  /**
   * List all frameworks with their control counts.
   */
  async getFrameworks() {
    const frameworks = await Framework.find({ isActive: true }).lean();
    const controlCounts = await Control.aggregate([
      { $group: { _id: '$framework', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    controlCounts.forEach((cc) => {
      countMap[cc._id.toString()] = cc.count;
    });

    return frameworks.map((f) => ({
      ...f,
      controlsCount: countMap[f._id.toString()] || 0
    }));
  }

  /**
   * Get single framework with all its defined controls.
   */
  async getFrameworkById(id) {
    const framework = await Framework.findById(id).lean();
    if (!framework) {
      const error = new Error('Framework not found');
      error.statusCode = 404;
      throw error;
    }

    const controls = await Control.find({ framework: id }).sort({ controlId: 1 }).lean();
    return {
      framework,
      controls
    };
  }

  /**
   * Create new compliance framework.
   */
  async createFramework(data) {
    const existing = await Framework.findOne({
      $or: [{ code: data.code.toUpperCase() }, { name: data.name }]
    });

    if (existing) {
      const error = new Error('A framework with this name or code already exists');
      error.statusCode = 409;
      throw error;
    }

    return Framework.create({
      ...data,
      code: data.code.toUpperCase()
    });
  }

  /**
   * Add a control to a framework.
   */
  async addControl(frameworkId, controlData) {
    const framework = await Framework.findById(frameworkId);
    if (!framework) {
      const error = new Error('Framework not found');
      error.statusCode = 404;
      throw error;
    }

    const existing = await Control.findOne({
      framework: frameworkId,
      controlId: controlData.controlId
    });

    if (existing) {
      const error = new Error(
        `Control '${controlData.controlId}' already exists in framework '${framework.name}'`
      );
      error.statusCode = 409;
      throw error;
    }

    return Control.create({
      ...controlData,
      framework: frameworkId
    });
  }

  /**
   * Get or initialize assessments for a given project and framework.
   */
  async getAssessments({ projectId, frameworkId }) {
    if (!projectId || !frameworkId) {
      const error = new Error('Both projectId and frameworkId are required');
      error.statusCode = 400;
      throw error;
    }

    const [project, framework, controls] = await Promise.all([
      Project.findById(projectId),
      Framework.findById(frameworkId),
      Control.find({ framework: frameworkId }).sort({ controlId: 1 })
    ]);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (!framework) {
      const error = new Error('Framework not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if assessments exist for this project + framework
    let assessments = await Assessment.find({
      project: projectId,
      framework: frameworkId
    })
      .populate('control')
      .populate('mappedVulnerabilities', 'cve title severity status')
      .populate('evaluatedBy', 'name email role')
      .lean();

    // If controls exist but assessments are missing, initialize them
    if (assessments.length < controls.length) {
      const existingControlIds = new Set(
        assessments.map((a) => a.control?._id?.toString() || a.control?.toString())
      );

      const missingControls = controls.filter(
        (c) => !existingControlIds.has(c._id.toString())
      );

      for (const ctrl of missingControls) {
        await Assessment.create({
          project: projectId,
          framework: frameworkId,
          control: ctrl._id,
          status: 'Compliant',
          score: 100,
          evidenceNotes: 'Baseline compliant. Pending audit verification.'
        });
      }

      // Re-fetch populated
      assessments = await Assessment.find({
        project: projectId,
        framework: frameworkId
      })
        .populate('control')
        .populate('mappedVulnerabilities', 'cve title severity status')
        .populate('evaluatedBy', 'name email role')
        .lean();
    }

    // Calculate framework compliance summary
    let compliant = 0;
    let nonCompliant = 0;
    let partiallyCompliant = 0;
    let notApplicable = 0;

    assessments.forEach((a) => {
      if (a.status === 'Compliant') compliant++;
      else if (a.status === 'Non-Compliant') nonCompliant++;
      else if (a.status === 'Partially Compliant') partiallyCompliant++;
      else if (a.status === 'Not Applicable') notApplicable++;
    });

    const applicableTotal = assessments.length - notApplicable;
    const score =
      applicableTotal > 0
        ? Math.round(((compliant * 100 + partiallyCompliant * 50) / (applicableTotal * 100)) * 100)
        : 100;

    return {
      project: { _id: project._id, name: project.name, key: project.key },
      framework: { _id: framework._id, name: framework.name, code: framework.code },
      assessments,
      summary: {
        totalControls: assessments.length,
        compliant,
        nonCompliant,
        partiallyCompliant,
        notApplicable,
        complianceScore: score
      }
    };
  }

  /**
   * Update an assessment (evidence, status, score) by an Analyst or Admin.
   */
  async updateAssessment(id, data, user) {
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      const error = new Error('Assessment record not found');
      error.statusCode = 404;
      throw error;
    }

    if (data.status) assessment.status = data.status;
    if (data.score !== undefined) assessment.score = data.score;
    if (data.evidenceNotes !== undefined) assessment.evidenceNotes = data.evidenceNotes;
    if (data.evidenceUrls !== undefined) assessment.evidenceUrls = data.evidenceUrls;

    assessment.evaluatedBy = user._id;
    assessment.lastEvaluatedAt = new Date();

    await assessment.save();

    return Assessment.findById(id)
      .populate('control')
      .populate('mappedVulnerabilities', 'cve title severity status')
      .populate('evaluatedBy', 'name email role');
  }

  /**
   * Automate project compliance evaluation against active vulnerabilities.
   */
  async evaluateProjectCompliance(projectId) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Get active (unresolved) vulnerabilities for project
    const activeVulns = await Vulnerability.find({
      project: projectId,
      status: { $in: ['Open', 'In Progress'] }
    });

    const assessments = await Assessment.find({ project: projectId }).populate('control');

    let updatedCount = 0;

    for (const ass of assessments) {
      if (!ass.control) continue;

      const controlCwEs = ass.control.mappedCwEs || [];
      if (controlCwEs.length === 0) continue;

      // Find active vulnerabilities matching this control's mapped CWEs
      const matchingVulns = activeVulns.filter((v) => {
        const vulnCwEs = v.cwe || [];
        return controlCwEs.some((cwe) => vulnCwEs.includes(cwe));
      });

      if (matchingVulns.length > 0) {
        ass.status = 'Non-Compliant';
        ass.score = 0;
        ass.mappedVulnerabilities = matchingVulns.map((v) => v._id);
        ass.evidenceNotes = `Automated check: Found ${matchingVulns.length} active findings (${matchingVulns
          .map((v) => v.cve || v.title)
          .join(', ')}) violating mapped control CWEs.`;
        ass.lastEvaluatedAt = new Date();
        await ass.save();
        updatedCount++;
      } else if (ass.mappedVulnerabilities.length > 0) {
        // Previously non-compliant, now all findings resolved
        ass.status = 'Compliant';
        ass.score = 100;
        ass.mappedVulnerabilities = [];
        ass.evidenceNotes = 'Automated check: All matching vulnerability findings resolved.';
        ass.lastEvaluatedAt = new Date();
        await ass.save();
        updatedCount++;
      }
    }

    return {
      message: `Automated compliance check completed. ${updatedCount} control assessments updated.`,
      evaluatedCount: assessments.length,
      updatedCount
    };
  }
}

export const complianceService = new ComplianceService();
export default complianceService;
