import api from './axios';

export const adminApi = {
  // User Management
  getUsers: async (params) => {
    const res = await api.get('/admin/users', { params });
    return res.data.data;
  },

  // Non-admin directory used for assignment dropdowns (Admin/Analyst/Developer)
  getAssignees: async (params) => {
    const res = await api.get('/users/assignees', { params });
    return res.data.data;
  },

  createUser: async (data) => {
    const res = await api.post('/admin/users', data);
    return res.data.data;
  },

  updateUser: async (id, data) => {
    const res = await api.put(`/admin/users/${id}`, data);
    return res.data.data;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },

  unlockUser: async (id) => {
    const res = await api.post(`/admin/users/${id}/unlock`);
    return res.data;
  },

  forceLogout: async (id) => {
    const res = await api.post(`/admin/users/${id}/force-logout`);
    return res.data;
  },

  // Admin Dashboard / Stats
  getDashboardStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data.data;
  },

  // API Key Management
  getApiKeys: async () => {
    const res = await api.get('/admin/api-keys');
    return res.data.data;
  },

  createApiKey: async (data) => {
    const res = await api.post('/admin/api-keys', data);
    return res.data.data;
  },

  revokeApiKey: async (id) => {
    const res = await api.post(`/admin/api-keys/${id}/revoke`);
    return res.data.data;
  },

  // Audit Logs
  getAuditLogs: async (params) => {
    const res = await api.get('/audit-logs', { params });
    return res.data.data;
  },

  exportAuditLogsCsv: async (params) => {
    const res = await api.get('/audit-logs/export', {
      params,
      responseType: 'blob'
    });
    return res.data;
  },

  // System Settings
  getSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data.data;
  },

  updateSettings: async (data) => {
    const res = await api.put('/admin/settings', data);
    return res.data.data;
  }
};

export default adminApi;
