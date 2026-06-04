import api from '../api';
import type { Farm, FarmActivityLog, FarmAuditReport, Paginated } from '../../types';

export const farmsService = {
  list:   () => api.get<Paginated<Farm>>('/farms/').then(r => r.data),
  get:    (id: string) => api.get<Farm>(`/farms/${id}/`).then(r => r.data),
  create: (data: Partial<Farm>) => api.post<Farm>('/farms/', data).then(r => r.data),
  createFarmForFarmer: (data: Partial<Farm> & { owner: string }) =>
    api.post<Farm>('/farms/', data).then(r => r.data),
  update: (id: string, data: Partial<Farm>) => api.patch<Farm>(`/farms/${id}/`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/farms/${id}/`),

  // Activity logs
  listLogs: (farmId: string) =>
    api.get<Paginated<FarmActivityLog>>(`/farms/${farmId}/activity-logs/`).then(r => r.data),
  createLog: (farmId: string, data: Partial<FarmActivityLog>) =>
    api.post<FarmActivityLog>(`/farms/${farmId}/activity-logs/`, data).then(r => r.data),
  updateLog: (farmId: string, logId: string, data: Partial<FarmActivityLog>) =>
    api.patch<FarmActivityLog>(`/farms/${farmId}/activity-logs/${logId}/`, data).then(r => r.data),

  // Audit reports
  listAudits: () => api.get<Paginated<FarmAuditReport>>('/farm-audit-reports/').then(r => r.data),
  getAudit:   (id: string) => api.get<FarmAuditReport>(`/farm-audit-reports/${id}/`).then(r => r.data),
  createAudit: (data: Partial<FarmAuditReport>) =>
    api.post<FarmAuditReport>('/farm-audit-reports/', data).then(r => r.data),
  updateAudit: (id: string, data: Partial<FarmAuditReport>) =>
    api.patch<FarmAuditReport>(`/farm-audit-reports/${id}/`, data).then(r => r.data),
};
