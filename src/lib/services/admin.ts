import api from '../api';
import type { User, FarmerProfile, InvestorProfile, Paginated } from '../../types';

export const adminService = {
  // Users
  listUsers: (params?: Record<string, string>) =>
    api.get<Paginated<User> | User[]>('/users/', { params }).then(r => r.data),
  getUser: (id: string) => api.get<User>(`/users/${id}/`).then(r => r.data),
  verifyUser: (id: string) => api.post(`/users/${id}/verify/`).then(r => r.data),
  suspendUser: (id: string) => api.post(`/users/${id}/suspend/`).then(r => r.data),
  listFarmers: () =>
    api.get<Paginated<User> | User[]>('/users/', { params: { role: 'farmer' } }).then(r => r.data),
  deleteUser: (id: string) => api.delete(`/users/${id}/`).then(r => r.data),

  // Farmer profiles — try /profiles/farmers/, fall back to users?role=farmer
  listFarmerProfiles: async (params?: Record<string, string>) => {
    try {
      return await api.get<Paginated<FarmerProfile> | FarmerProfile[]>('/profiles/farmers/', { params }).then(r => r.data);
    } catch {
      return api.get<Paginated<User> | User[]>('/users/', { params: { ...params, role: 'farmer' } }).then(r => r.data);
    }
  },
  getFarmerProfile: (id: string) =>
    api.get<FarmerProfile>(`/profiles/farmers/${id}/`).then(r => r.data),

  // Investor profiles — try /profiles/investors/, fall back to users?role=investor
  listInvestorProfiles: async () => {
    try {
      return await api.get<Paginated<InvestorProfile> | InvestorProfile[]>('/profiles/investors/').then(r => r.data);
    } catch {
      return api.get<Paginated<User> | User[]>('/users/', { params: { role: 'investor' } }).then(r => r.data);
    }
  },
};
