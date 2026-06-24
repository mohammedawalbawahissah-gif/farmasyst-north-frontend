import api from '../api';
import type { Paginated } from '../../types';

export interface ProjectFarmerEntry {
  id: string;
  project: string;
  farmer_account: string | null;
  full_name: string;
  phone: string;
  ghana_card_number: string;
  district: string;
  region: string;
  community: string;
  farm_name: string;
  flock_type: string;
  flock_size: number;
  farm_size_acres: string | null;
  amount_requested: string | null;
  notes: string;
  created_at: string;
}

export interface ProjectApplication {
  id: string;
  reference: string;
  project_name: string;
  organisation: string;
  submitted_by: string | null;
  submitted_by_name: string | null;
  credit_type: string;
  total_amount_requested: string | null;
  repayment_period_months: number | null;
  purpose: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'withdrawn';
  reviewer: string | null;
  reviewer_name: string | null;
  reviewer_notes: string;
  rejection_reason: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  farmer_entries: ProjectFarmerEntry[];
  farmer_count: number;
}

export type ProjectPayload = {
  project_name: string;
  organisation: string;
  credit_type: string;
  total_amount_requested?: number;
  repayment_period_months?: number;
  purpose: string;
};

export const projectService = {
  list: (params?: Record<string, string>) =>
    api.get<Paginated<ProjectApplication>>('/credit/projects/', { params }).then(r => r.data),

  get: (id: string) =>
    api.get<ProjectApplication>(`/credit/projects/${id}/`).then(r => r.data),

  create: (data: ProjectPayload) =>
    api.post<ProjectApplication>('/credit/projects/', data).then(r => r.data),

  update: (id: string, data: Partial<ProjectPayload>) =>
    api.patch<ProjectApplication>(`/credit/projects/${id}/`, data).then(r => r.data),

  submit: (id: string) =>
    api.post<ProjectApplication>(`/credit/projects/${id}/submit/`).then(r => r.data),

  approve: (id: string, notes?: string) =>
    api.post<ProjectApplication>(`/credit/projects/${id}/approve/`, { notes }).then(r => r.data),

  reject: (id: string, reason: string, notes?: string) =>
    api.post<ProjectApplication>(`/credit/projects/${id}/reject/`, { reason, notes }).then(r => r.data),

  withdraw: (id: string) =>
    api.post<ProjectApplication>(`/credit/projects/${id}/withdraw/`).then(r => r.data),

  addFarmer: (id: string, entry: Omit<ProjectFarmerEntry, 'id' | 'project' | 'created_at'>) =>
    api.post<ProjectFarmerEntry>(`/credit/projects/${id}/add_farmer/`, entry).then(r => r.data),

  removeFarmer: (projectId: string, entryId: string) =>
    api.delete(`/credit/projects/${projectId}/remove_farmer/${entryId}/`),
};
