import api from '../api';
import type { Notification, Paginated } from '../../types';

export const notificationsService = {
  list: (page = 1) =>
    api.get<Paginated<Notification>>('/notifications/', { params: { page } }).then(r => r.data),
  unreadCount: () =>
    api.get<{ unread: number }>('/notifications/unread_count/').then(r => r.data.unread),
  markRead: (id: string) =>
    api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () =>
    api.post('/notifications/mark_all_read/'),
  // Primary names
  creditWorkflow: () =>
    api.get<Notification[]>('/notifications/credit_workflow/').then(r => r.data),
  resend: (id: string) =>
    api.post(`/notifications/${id}/resend/`),
  // Aliases used by CreditAlerts.tsx
  listCreditAlerts: () =>
    api.get<Paginated<Notification>>('/notifications/credit_workflow/').then(r => r.data),
  resendAlert: (id: string) =>
    api.post(`/notifications/${id}/resend/`),
};

export const CREDIT_ALERT_META: Record<string, {
  label: string; recipients: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent'; icon: string;
}> = {
  application_submitted:    { label: 'Application Submitted',     recipients: ['farmer', 'admin'],             priority: 'medium', icon: '📝' },
  application_under_review: { label: 'Under Review',              recipients: ['farmer'],                      priority: 'low',    icon: '🔍' },
  application_scored:       { label: 'Credit Score Assigned',     recipients: ['admin'],                       priority: 'medium', icon: '📊' },
  application_approved:     { label: 'Application Approved',      recipients: ['farmer', 'admin'],             priority: 'high',   icon: '✅' },
  application_rejected:     { label: 'Application Rejected',      recipients: ['farmer'],                      priority: 'high',   icon: '❌' },
  investor_matched:         { label: 'Investor Matched',          recipients: ['investor', 'admin'],           priority: 'high',   icon: '🤝' },
  investor_accepted:        { label: 'Investor Accepted',         recipients: ['farmer', 'admin'],             priority: 'urgent', icon: '🎉' },
  investor_declined:        { label: 'Investor Declined',         recipients: ['admin'],                       priority: 'medium', icon: '↩️' },
  agreement_created:        { label: 'Agreement Created',         recipients: ['farmer', 'investor', 'admin'], priority: 'high',   icon: '📄' },
  agreement_signed_farmer:  { label: 'Farmer Signed Agreement',   recipients: ['investor', 'admin'],           priority: 'high',   icon: '✍️' },
  agreement_signed_investor:{ label: 'Investor Signed Agreement', recipients: ['farmer', 'admin'],             priority: 'high',   icon: '✍️' },
  disbursement_requested:   { label: 'Disbursement Requested',    recipients: ['admin', 'investor'],           priority: 'urgent', icon: '💸' },
  disbursement_approved:    { label: 'Disbursement Approved',     recipients: ['investor', 'farmer', 'admin'], priority: 'urgent', icon: '✅' },
  disbursement_rejected:    { label: 'Disbursement Rejected',     recipients: ['investor'],                    priority: 'high',   icon: '🚫' },
  funds_disbursed:          { label: 'Funds Disbursed',           recipients: ['farmer', 'investor', 'admin'], priority: 'urgent', icon: '🏦' },
  repayment_due:            { label: 'Repayment Due',             recipients: ['farmer', 'investor'],          priority: 'high',   icon: '📅' },
  repayment_received:       { label: 'Repayment Received',        recipients: ['farmer', 'investor', 'admin'], priority: 'medium', icon: '💰' },
  repayment_overdue:        { label: 'Repayment Overdue',         recipients: ['farmer', 'investor', 'admin'], priority: 'urgent', icon: '⚠️' },
};

/** Build the SSE stream URL with the JWT token as a query param. */
export function buildSSEUrl(accessToken: string): string {
  const rootUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
  const base = `${rootUrl.replace(/\/$/, '')}/api/v1`;
  return `${base}/notifications/stream/?token=${encodeURIComponent(accessToken)}`;
}
