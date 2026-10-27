import api from './axios';

export const complianceApi = {
  getFrameworks: async () => {
    const response = await api.get('/frameworks');
    return response.data;
  },

  getFrameworkById: async (id) => {
    const response = await api.get(`/frameworks/${id}`);
    return response.data;
  },

  getAssessments: async (projectId, frameworkId) => {
    const response = await api.get('/assessments', {
      params: { project: projectId, framework: frameworkId }
    });
    return response.data;
  },

  updateAssessment: async (id, data) => {
    const response = await api.patch(`/assessments/${id}`, data);
    return response.data;
  },

  evaluateProject: async (projectId) => {
    const response = await api.post(`/assessments/evaluate/${projectId}`);
    return response.data;
  }
};

export default complianceApi;
