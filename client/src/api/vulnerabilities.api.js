import api from './axios';

export const vulnerabilitiesApi = {
  getVulnerabilities: async (params = {}) => {
    const response = await api.get('/vulnerabilities', { params });
    return response.data;
  },

  getVulnerabilityById: async (id) => {
    const response = await api.get(`/vulnerabilities/${id}`);
    return response.data;
  },

  updateStatus: async (id, status, reason = '') => {
    const response = await api.patch(`/vulnerabilities/${id}/status`, { status, reason });
    return response.data;
  },

  assignVulnerability: async (id, assigneeId) => {
    const response = await api.patch(`/vulnerabilities/${id}/assign`, { assigneeId });
    return response.data;
  },

  addComment: async (id, content) => {
    const response = await api.post(`/vulnerabilities/${id}/comments`, { content });
    return response.data;
  },

  bulkUpdate: async (payload) => {
    const response = await api.patch('/vulnerabilities/bulk', payload);
    return response.data;
  }
};

export default vulnerabilitiesApi;
