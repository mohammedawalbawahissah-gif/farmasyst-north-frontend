import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../lib/notification-context';
import { notificationsService } from '../../lib/services/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import type { Notification } from '../../types';
import NotificationDetail from './NotificationDetail';

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626',
  high:   '#ea580c',
  medium: '#2D4A1E',
  low:    '#9ca3af',
};

export default function NotificationBell() {
  const { unread, markAllRead, refreshUnread } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open,     setOpen]     = useState(false);
  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationsService.list(1)
      .then(data => setNotifs(Array.isArray(data) ? data : (data as any).results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(`/${user?.role}/notifications`);
  };

  const handleNotifClick = async (n: Notification) => {
    // Mark as read if not already
    if (!n.is_read) {
      await notificationsService.markRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      refreshUnread();
    }
    // Open detail modal — close the dropdown panel first so they don't overlap
    setOpen(false);
    setSelected({ ...n, is_read: true });
  };

  const recent = notifs.slice(0, 8);

  return (
    <div style={{ position: 'relative' }}>
      {/* Detail modal (rendered outside the panel so z-index stacks correctly) */}
      {selected && (
        <NotificationDetail
          notification={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: 8,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={18} color="#fff" />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -3, right: -3,
            background: '#E8A020',
            color: '#fff',
            borderRadius: '50%',
            minWidth: 18, height: 18,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--col-sidebar-bg, #2D4A1E)',
            padding: '0 2px',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: 60,
            left: 8,
            width: 340,
            maxWidth: 'calc(100vw - 16px)',
            background: 'var(--col-surface, #fff)',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            border: '1px solid var(--col-border, #e8e4dc)',
            zIndex: 999,
            overflow: 'hidden',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--col-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--col-text)' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: '#E8A020',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 10,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--col-muted)', display: 'flex', alignItems: 'center',
                    gap: 4, fontSize: 12, padding: '4px 8px', borderRadius: 6,
                  }}
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--col-muted)', padding: 4, display: 'flex',
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--col-muted)', fontSize: 13 }}>
                Loading…
              </div>
            ) : recent.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--col-muted)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              recent.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    width: '100%', background: n.is_read ? 'transparent' : 'rgba(232,160,32,0.06)',
                    border: 'none', borderBottom: '1px solid var(--col-border)',
                    padding: '12px 16px', cursor: 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--col-chalk, #f7f4ee)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(232,160,32,0.06)')}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: n.is_read ? 'transparent' : (PRIORITY_DOT[n.priority ?? 'medium']),
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 2px',
                      fontSize: 13,
                      fontWeight: n.is_read ? 400 : 600,
                      color: 'var(--col-text)',
                      lineHeight: 1.3,
                    }}>
                      {n.title}
                    </p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--col-muted)', lineHeight: 1.4 }}>
                      {n.message ?? n.body}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--col-muted)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--col-border)',
            flexShrink: 0,
          }}>
            <button
              onClick={handleViewAll}
              style={{
                width: '100%', background: 'none',
                border: '1px solid var(--col-border)',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 13, fontWeight: 600,
                color: 'var(--col-text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, fontFamily: 'inherit',
              }}
            >
              <ExternalLink size={13} /> View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
