import PipelineRun from '../models/PipelineRun.js';

export class PipelineController {
  async getPipelines(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.project) query.project = req.query.project;
      if (req.query.status) query.status = req.query.status;
      if (req.query.branch) query.branch = req.query.branch;

      const [pipelines, total] = await Promise.all([
        PipelineRun.find(query)
          .populate('project', 'name key criticality')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PipelineRun.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        message: 'Pipeline runs retrieved successfully',
        data: {
          pipelines,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getPipelineById(req, res, next) {
    try {
      const pipeline = await PipelineRun.findById(req.params.id).populate(
        'project',
        'name key criticality repositoryUrl gatePolicy'
      );

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          message: 'Pipeline execution run not found',
          data: null
        });
      }

      res.status(200).json({
        success: true,
        message: 'Pipeline run details retrieved',
        data: { pipeline }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const pipelineController = new PipelineController();
export default pipelineController;
