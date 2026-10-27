import scanIngestionService from '../services/scanIngestion.service.js';

export class WebhookController {
  async handleScanWebhook(req, res, next) {
    try {
      const { project, tool, scanType, pipeline, report } = req.body;

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Field 'project' (name or key) is required in webhook payload.",
          data: null
        });
      }

      if (!tool) {
        return res.status(400).json({
          success: false,
          message: "Field 'tool' (e.g. 'trivy', 'gitleaks', 'npm-audit', 'semgrep') is required.",
          data: null
        });
      }

      if (!report) {
        return res.status(400).json({
          success: false,
          message: "Field 'report' containing tool JSON scan output is required.",
          data: null
        });
      }

      const result = await scanIngestionService.processScanReport({
        projectIdentifier: project,
        tool,
        scanType,
        pipeline: pipeline || {},
        rawReport: report,
        autoCreateProject: !!req.apiKey?.autoCreateProject,
        ingestionMethod: 'webhook'
      });

      res.status(200).json({
        success: true,
        message: 'Security scan report ingested and evaluated successfully.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
export default webhookController;
