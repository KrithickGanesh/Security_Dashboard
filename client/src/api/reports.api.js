import api from './axios';

export const reportsApi = {
  downloadExecutivePdf: async () => {
    const res = await api.get('/reports/executive-summary/pdf', {
      responseType: 'blob'
    });
    return res.data;
  },

  downloadVulnerabilitiesCsv: async (params) => {
    const res = await api.get('/reports/vulnerabilities/csv', {
      params,
      responseType: 'blob'
    });
    return res.data;
  },

  downloadComplianceCsv: async () => {
    const res = await api.get('/reports/compliance/csv', {
      responseType: 'blob'
    });
    return res.data;
  }
};

export default reportsApi;
