import dashboardService from '../services/dashboard.service.js';

export class DashboardController {
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.status(200).json({
        success: true,
        message: 'Dashboard metrics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
export default dashboardController;
