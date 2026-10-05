import { api } from './api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  region?: string;
  jurisdictions?: string[];
}

export const authService = {
  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async requestOtp(contactType: 'email' | 'phone', contactValue: string) {
    const res = await api.post('/auth/request-otp', { contactType, contactValue });
    return res.data;
  },

  async verifyOtp(sessionId: string, otpCode: string) {
    const res = await api.post('/auth/verify-otp', { sessionId, otpCode });
    return res.data;
  },

  async getMe(): Promise<{ success: boolean; data: any }> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async logout() {
    const res = await api.post('/auth/logout');
    return res.data;
  },
};
