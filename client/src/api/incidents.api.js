import api from './axios';

export const incidentsApi = {
  getIncidents: async (params) => {
    const res = await api.get('/incidents', { params });
    return res.data.data;
  },

  getIncidentById: async (id) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data.data;
  },

  createIncident: async (data) => {
    const res = await api.post('/incidents', data);
    return res.data.data;
  },

  updateStatus: async (id, data) => {
    const res = await api.patch(`/incidents/${id}/status`, data);
    return res.data.data;
  },

  assignIncident: async (id, data) => {
    const res = await api.patch(`/incidents/${id}/assign`, data);
    return res.data.data;
  },

  updatePostMortem: async (id, data) => {
    const res = await api.patch(`/incidents/${id}/post-mortem`, data);
    return res.data.data;
  }
};

export default incidentsApi;
