import api from './axios';

export const pipelinesApi = {
  getPipelines: async (params = {}) => {
    const response = await api.get('/pipelines', { params });
    return response.data;
  },

  getPipelineById: async (id) => {
    const response = await api.get(`/pipelines/${id}`);
    return response.data;
  }
};

export default pipelinesApi;
