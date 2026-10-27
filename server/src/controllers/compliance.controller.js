import complianceService from '../services/compliance.service.js';

export class ComplianceController {
  async getFrameworks(req, res, next) {
    try {
      const frameworks = await complianceService.getFrameworks();
      res.status(200).json({
        success: true,
        message: 'Frameworks retrieved successfully',
        data: { frameworks }
      });
    } catch (error) {
      next(error);
    }
  }

  async getFrameworkById(req, res, next) {
    try {
      const result = await complianceService.getFrameworkById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Framework details retrieved',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async createFramework(req, res, next) {
    try {
      const framework = await complianceService.createFramework(req.body);
      res.status(201).json({
        success: true,
        message: 'Compliance framework created',
        data: { framework }
      });
    } catch (error) {
      next(error);
    }
  }

  async addControl(req, res, next) {
    try {
      const control = await complianceService.addControl(req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Control added to framework',
        data: { control }
      });
    } catch (error) {
      next(error);
    }
  }

  async getAssessments(req, res, next) {
    try {
      const { project, framework } = req.query;
      const result = await complianceService.getAssessments({
        projectId: project,
        frameworkId: framework
      });
      res.status(200).json({
        success: true,
        message: 'Assessments retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAssessment(req, res, next) {
    try {
      const updated = await complianceService.updateAssessment(
        req.params.id,
        req.body,
        req.user
      );
      res.status(200).json({
        success: true,
        message: 'Assessment updated successfully',
        data: { assessment: updated }
      });
    } catch (error) {
      next(error);
    }
  }

  async evaluateProject(req, res, next) {
    try {
      const result = await complianceService.evaluateProjectCompliance(req.params.projectId);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const complianceController = new ComplianceController();
export default complianceController;
