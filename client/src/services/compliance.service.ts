import { api } from './api';

export const complianceService = {
  async getConsents(params?: { applicantId?: string; caseId?: string; search?: string }) {
    const res = await api.get('/compliance/consents', { params });
    return res.data;
  },

  async createDsar(email: string, type: 'ACCESS' | 'DELETION' | 'CORRECTION', reason?: string) {
    const res = await api.post('/compliance/dsar', { email, type, reason });
    return res.data;
  },

  async getDsarRequests() {
    const res = await api.get('/compliance/dsar');
    return res.data;
  },

  async executeDsar(id: string) {
    const res = await api.post(`/compliance/dsar/${id}/execute`);
    return res.data;
  },

  async getRetentionPolicies() {
    const res = await api.get('/compliance/retention');
    return res.data;
  },

  async getAuditLogs(params?: { action?: string; actor?: string; resource?: string; search?: string }) {
    const res = await api.get('/compliance/audit', { params });
    return res.data;
  },
};
