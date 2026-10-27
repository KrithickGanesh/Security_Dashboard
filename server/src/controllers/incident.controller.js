import incidentService from '../services/incident.service.js';

export class IncidentController {
  async getIncidents(req, res, next) {
    try {
      const data = await incidentService.getIncidents(req.query);
      res.status(200).json({
        success: true,
        message: 'Incidents retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getIncidentById(req, res, next) {
    try {
      const incident = await incidentService.getIncidentById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Incident details retrieved successfully',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }

  async createIncident(req, res, next) {
    try {
      const incident = await incidentService.createIncident(req.body, req.user, req);
      res.status(201).json({
        success: true,
        message: 'Incident registered successfully',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const incident = await incidentService.updateStatus(
        req.params.id,
        req.body,
        req.user,
        req
      );
      res.status(200).json({
        success: true,
        message: 'Incident status updated successfully',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }

  async assignIncident(req, res, next) {
    try {
      const incident = await incidentService.assignIncident(
        req.params.id,
        req.body,
        req.user,
        req
      );
      res.status(200).json({
        success: true,
        message: 'Incident assignment updated successfully',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePostMortem(req, res, next) {
    try {
      const incident = await incidentService.updatePostMortem(
        req.params.id,
        req.body,
        req.user,
        req
      );
      res.status(200).json({
        success: true,
        message: 'Post-mortem recorded successfully',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }
}

export const incidentController = new IncidentController();
export default incidentController;
