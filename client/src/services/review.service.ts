import { api } from './api';

export const reviewService = {
  async getQueue(params?: {
    status?: string;
    risk?: string;
    jurisdiction?: string;
    docType?: string;
    search?: string;
  }) {
    const res = await api.get('/reviews/queue', { params });
    return res.data;
  },

  async claimCase(caseId: string) {
    const res = await api.post(`/reviews/${caseId}/claim`);
    return res.data;
  },

  async decideCase(
    caseId: string,
    action: 'APPROVE' | 'REJECT' | 'RESUBMIT' | 'ESCALATE',
    reasonCodes: string[] = [],
    notes?: string
  ) {
    const res = await api.post(`/reviews/${caseId}/decide`, { action, reasonCodes, notes });
    return res.data;
  },

  async revealPii(caseId: string, justification: string) {
    const res = await api.post(`/reviews/${caseId}/reveal-pii`, { justification });
    return res.data;
  },

  async overrideDecision(caseId: string, targetOutcome: 'APPROVED' | 'REJECTED', justification: string) {
    const res = await api.post(`/reviews/${caseId}/override`, { targetOutcome, justification });
    return res.data;
  },
};
