import reportService from '../services/report.service.js';
import { format } from 'date-fns';

export class ReportController {
  /**
   * Stream executive PDF report.
   */
  async getExecutivePdf(req, res, next) {
    try {
      await reportService.streamExecutiveSummaryPdf(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export vulnerabilities to CSV.
   */
  async exportVulnerabilitiesCsv(req, res, next) {
    try {
      const csv = await reportService.exportVulnerabilitiesCsv(req.query);
      res.header('Content-Type', 'text/csv');
      res.attachment(`vulnerabilities_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export compliance matrix to CSV.
   */
  async exportComplianceCsv(req, res, next) {
    try {
      const csv = await reportService.exportComplianceCsv();
      res.header('Content-Type', 'text/csv');
      res.attachment(`compliance_controls_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
export default reportController;
