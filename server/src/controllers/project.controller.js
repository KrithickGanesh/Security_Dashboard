import projectService from '../services/project.service.js';

export class ProjectController {
  async getProjects(req, res, next) {
    try {
      const result = await projectService.getProjects(req.query);
      res.status(200).json({
        success: true,
        message: 'Projects retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req, res, next) {
    try {
      const result = await projectService.getProjectById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Project retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async createProject(req, res, next) {
    try {
      const project = await projectService.createProject(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req, res, next) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: { project }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req, res, next) {
    try {
      const result = await projectService.deleteProject(req.params.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
export default projectController;
