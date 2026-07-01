import {
  useEffect, useRef, useState,
  useCallback, type ReactNode,
} from 'react';
import { useAuth } from './hooks/useAuth';
import { buildSSEUrl, notificationsService } from './services/notifications';
import type { Notification } from '../types';
import { NotificationContext } from './notification-context-def';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user }        = useAuth();
  const [unread, setUnread]   = useState(0);
  const [toasts, setToasts]   = useState<Notification[]>([]);
  const eventSourceRef  = useRef<EventSource | null>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await notificationsService.unreadCount();
      setUnread(count);
    } catch { /* ignore */ }
  }, []);

  const addToast = useCallback((notif: Notification) => {
    setToasts(prev => [notif, ...prev].slice(0, 5));
    setUnread(n => n + 1);
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== notif.id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markRead(id);
      setUnread(n => Math.max(0, n - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsService.markAllRead();
      setUnread(0);
    } catch { /* ignore */ }
  }, []);

  // ── Connect SSE when user logs in ────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      // Clean up on logout
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      // Defer so we don't setState synchronously within the effect body
      queueMicrotask(() => {
        setUnread(0);
        setToasts([]);
      });
      return;
    }

    // Initial unread count — deferred for the same reason as above
    queueMicrotask(() => { refreshUnread(); });

    // Get access token from localStorage (matches how api.ts stores it)
    const accessToken = localStorage.getItem('fa_access') ?? '';
    if (!accessToken) {
      // Fall back to polling if no token available for SSE
      pollRef.current = setInterval(refreshUnread, 30_000);
      return;
    }

    // Open SSE connection
    const url = buildSSEUrl(accessToken);
    const es  = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      // Connection confirmed — clear any polling fallback
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    });

    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const notif: Notification = JSON.parse(e.data);
        addToast(notif);
      } catch { /* ignore malformed data */ }
    });

    es.addEventListener('error', () => {
      // SSE disconnected — fall back to polling until reconnect
      if (!pollRef.current) {
        pollRef.current = setInterval(refreshUnread, 15_000);
      }
    });

    // Reconnect polling: browsers auto-reconnect SSE after 3s,
    // but we also keep a light 60s poll as belt-and-suspenders
    const longPoll = setInterval(refreshUnread, 60_000);

    return () => {
      es.close();
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(longPoll);
    };
  }, [user, refreshUnread, addToast]);

  return (
    <NotificationContext.Provider value={{ unread, toasts, dismissToast, markRead, markAllRead, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}
