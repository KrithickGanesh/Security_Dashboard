import multer from 'multer';
import scanIngestionService from '../services/scanIngestion.service.js';
import ScanResult from '../models/ScanResult.js';

// Multer memory storage configuration (Max 10 MB JSON files)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/json' ||
      file.originalname.endsWith('.json') ||
      file.mimetype === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON report files are supported'), false);
    }
  }
});

export class ScanUploadController {
  async handleScanUpload(req, res, next) {
    try {
      const { project, tool, scanType } = req.body;

      if (!req.file && !req.body.report) {
        return res.status(400).json({
          success: false,
          message: 'Please attach a JSON report file or provide raw report JSON.',
          data: null
        });
      }

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Field 'project' (ID or key) is required.",
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

      let rawReport;
      if (req.file) {
        try {
          rawReport = JSON.parse(req.file.buffer.toString('utf8'));
        } catch (parseErr) {
          return res.status(422).json({
            success: false,
            message: 'Failed to parse uploaded file as valid JSON: ' + parseErr.message,
            data: null
          });
        }
      } else {
        rawReport = typeof req.body.report === 'string' ? JSON.parse(req.body.report) : req.body.report;
      }

      const result = await scanIngestionService.processScanReport({
        projectIdentifier: project,
        tool,
        scanType,
        pipeline: {
          provider: 'manual-upload',
          runId: `manual-${Date.now()}`,
          branch: 'workspace',
          commit: 'local',
          triggeredBy: req.user.name
        },
        rawReport,
        autoCreateProject: false,
        ingestionMethod: 'manual',
        uploadedBy: req.user._id
      });

      res.status(200).json({
        success: true,
        message: 'Scan uploaded, parsed, and evaluated successfully.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getScanHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.project) query.project = req.query.project;
      if (req.query.tool) query.tool = req.query.tool;

      const [history, total] = await Promise.all([
        ScanResult.find(query)
          .populate('project', 'name key')
          .populate('uploadedBy', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ScanResult.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        message: 'Scan history retrieved',
        data: {
          history,
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
}

export const scanUploadController = new ScanUploadController();
export default scanUploadController;
