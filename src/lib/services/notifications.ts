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

  creditWorkflow: () =>
    api.get<Notification[]>('/notifications/credit_workflow/').then(r => r.data),

  resend: (id: string) =>
    api.post(`/notifications/${id}/resend/`),
};

/** Build the SSE stream URL with the JWT token as a query param. */
export function buildSSEUrl(accessToken: string): string {
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');
  return `${base}/notifications/stream/?token=${encodeURIComponent(accessToken)}`;
}
