import { api } from './api';

export const caseService = {
  async createCase(data: {
    applicantId: string;
    country?: string;
    documentType: string;
    jurisdiction?: string;
    riskTier?: string;
  }) {
    const res = await api.post('/cases', data);
    return res.data;
  },

  async getCaseById(caseId: string) {
    const res = await api.get(`/cases/${caseId}`);
    return res.data;
  },

  async getCaseStatus(caseId: string) {
    const res = await api.get(`/cases/${caseId}/status`);
    return res.data;
  },

  async uploadDocuments(caseId: string, frontFile: File, backFile?: File) {
    const formData = new FormData();
    formData.append('front', frontFile);
    if (backFile) {
      formData.append('back', backFile);
    }
    const res = await api.post(`/cases/${caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async uploadSelfie(caseId: string, selfieFile: File, activeChallenge?: string) {
    const formData = new FormData();
    formData.append('selfie', selfieFile);
    if (activeChallenge) {
      formData.append('activeChallenge', activeChallenge);
    }
    const res = await api.post(`/cases/${caseId}/selfie`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async submitCase(caseId: string) {
    const res = await api.post(`/cases/${caseId}/submit`);
    return res.data;
  },

  async resubmitCase(caseId: string) {
    const res = await api.post(`/cases/${caseId}/resubmit`);
    return res.data;
  },
};
