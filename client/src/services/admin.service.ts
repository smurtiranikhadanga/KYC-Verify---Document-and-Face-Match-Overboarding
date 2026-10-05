import { api } from './api';

export const adminService = {
  async getUsers() {
    const res = await api.get('/admin/users');
    return res.data;
  },

  async updateUserRole(id: string, role: string) {
    const res = await api.patch(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  async updateUserStatus(id: string, isActive: boolean) {
    const res = await api.patch(`/admin/users/${id}/status`, { isActive });
    return res.data;
  },

  async getStats() {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  async getPolicies() {
    const res = await api.get('/admin/policies');
    return res.data;
  },

  async updatePolicy(id: string, updates: any) {
    const res = await api.patch(`/admin/policies/${id}`, updates);
    return res.data;
  },
};
