import { api } from './api';

export const mlopsService = {
  async getModels() {
    const res = await api.get('/mlops/models');
    return res.data;
  },

  async getMetrics() {
    const res = await api.get('/mlops/metrics');
    return res.data;
  },

  async getDrift() {
    const res = await api.get('/mlops/drift');
    return res.data;
  },

  async getRuns() {
    const res = await api.get('/mlops/runs');
    return res.data;
  },

  async getFunnel() {
    const res = await api.get('/mlops/funnel');
    return res.data;
  },
};
