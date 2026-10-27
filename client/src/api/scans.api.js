import api from './axios';

export const scansApi = {
  uploadScan: async (formData) => {
    const response = await api.post('/scans/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getScanHistory: async (params = {}) => {
    const response = await api.get('/scans/history', { params });
    return response.data;
  }
};

export default scansApi;
