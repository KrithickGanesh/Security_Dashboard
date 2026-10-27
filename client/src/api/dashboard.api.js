import api from './axios';

export const dashboardApi = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data.data;
  }
};

export default dashboardApi;
