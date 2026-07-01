import api from '../api';
import type { RepaymentSchedule, Disbursement, DisbursementRequest, Paginated } from '../../types';

export interface RepayPayload {
  schedule_id: string;
  method: 'momo' | 'paystack';
  phone_number?: string;
  amount?: number; // optional partial amount
}

export interface RequestDisbursementPayload {
  agreement: string;
  method: 'momo' | 'paystack' | 'cash' | 'in_kind';
  note?: string;
}

export interface ApproveDisbursementPayload {
  method: 'momo' | 'paystack' | 'cash' | 'in_kind';
  notes?: string;
}

export interface PayFullBalancePayload {
  agreement_id: string;
  method: 'momo' | 'paystack';
  phone_number?: string;
}

export interface PayFullBalanceResult {
  payment: unknown;
  total_amount: string;
  instalments_count: number;
  authorization_url?: string;
}

export interface RepayResult {
  payment: unknown;
  authorization_url?: string;
}

export const paymentsService = {
  // ── Repayment Schedules ──────────────────────────────────────────────────
  listSchedules: (params?: Record<string, string>) =>
    api.get<Paginated<RepaymentSchedule>>('/payments/schedules/', { params }).then(r => r.data),
  getSchedule: (id: string) =>
    api.get<RepaymentSchedule>(`/payments/schedules/${id}/`).then(r => r.data),
  initiateRepayment: (data: RepayPayload): Promise<RepayResult> =>
    api.post('/payments/initiate-repayment/', data).then(r => r.data),
  payFullBalance: (data: PayFullBalancePayload) =>
    api.post<PayFullBalanceResult>('/payments/pay-full-balance/', data).then(r => r.data),

  // ── Disbursements (read) ─────────────────────────────────────────────────
  listDisbursements: () =>
    api.get<Paginated<Disbursement>>('/payments/disbursements/').then(r => r.data),

  // ── Disbursement Requests ────────────────────────────────────────────────
  listDisbursementRequests: () =>
    api.get<Paginated<DisbursementRequest>>('/payments/disbursement-requests/').then(r => r.data),
  getDisbursementRequest: (id: string) =>
    api.get<DisbursementRequest>(`/payments/disbursement-requests/${id}/`).then(r => r.data),
  requestDisbursement: (data: RequestDisbursementPayload) =>
    api.post<DisbursementRequest>('/payments/disbursement-requests/', data).then(r => r.data),
  approveDisbursementRequest: (id: string, data: ApproveDisbursementPayload) =>
    api.post<DisbursementRequest>(`/payments/disbursement-requests/${id}/approve/`, data).then(r => r.data),
  rejectDisbursementRequest: (id: string, reason: string) =>
    api.post<DisbursementRequest>(`/payments/disbursement-requests/${id}/reject/`, { reason }).then(r => r.data),
};
