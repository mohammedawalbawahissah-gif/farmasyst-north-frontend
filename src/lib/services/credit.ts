import api from '../api';
import type { CreditApplication, CreditAgreement, Paginated } from '../../types';

export interface AppPayload {
  credit_type: string; purpose: string; farm?: string;
  amount_requested?: number; repayment_period_months?: number; input_details?: string;
}

export const creditService = {
  // Applications
  listApps: (params?: Record<string, string>) =>
    api.get<Paginated<CreditApplication>>('/credit/applications/', { params }).then(r => r.data),
  getApp: (id: string) =>
    api.get<CreditApplication>(`/credit/applications/${id}/`).then(r => r.data),
  createApp: (data: AppPayload) =>
    api.post<CreditApplication>('/credit/applications/', data).then(r => r.data),
  updateApp: (id: string, data: Partial<AppPayload>) =>
    api.patch<CreditApplication>(`/credit/applications/${id}/`, data).then(r => r.data),
  submitApp: (id: string) =>
    api.post<CreditApplication>(`/credit/applications/${id}/submit/`).then(r => r.data),
  approveApp: (id: string, notes?: string) =>
    api.post<CreditApplication>(`/credit/applications/${id}/approve/`, { notes }).then(r => r.data),
  rejectApp: (id: string, reason: string, notes?: string) =>
    api.post<CreditApplication>(`/credit/applications/${id}/reject/`, { reason, notes }).then(r => r.data),

  // Document upload
  uploadDoc: (appId: string, file: File, doc_type: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', doc_type);
    return api.post(`/credit/applications/${appId}/documents/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Matching
  matchToInvestor: (appId: string, investorId: string) =>
    api.post<CreditApplication>(`/credit/applications/${appId}/match/`, { investor: investorId }).then(r => r.data),
  declineMatch: (appId: string) =>
    api.post<CreditApplication>(`/credit/applications/${appId}/decline_match/`).then(r => r.data),

  // Investor: list applications matched to them (get_queryset filters to matched_investor=user)
  listMatchedForInvestor: () =>
    api.get<CreditApplication[] | { results: CreditApplication[] }>('/credit/applications/').then(r => r.data),

  listAgreements: () =>
    api.get<Paginated<CreditAgreement> | CreditAgreement[]>('/credit/agreements/').then(r => r.data),
  getAgreement: (id: string) =>
    api.get<CreditAgreement>(`/credit/agreements/${id}/`).then(r => r.data),
  signAgreement: (id: string) =>
    api.post<CreditAgreement>(`/credit/agreements/${id}/sign/`).then(r => r.data),
  generateDocument: (id: string) =>
    api.post<CreditAgreement>(`/credit/agreements/${id}/generate_document/`).then(r => r.data),

  // Investor accept/decline a matched application
  acceptMatch: (appId: string) =>
    api.post<CreditAgreement>(`/credit/applications/${appId}/accept/`).then(r => r.data),
  declineMatchByInvestor: (appId: string) =>
    api.post<CreditApplication>(`/credit/applications/${appId}/decline_match/`).then(r => r.data),
};
