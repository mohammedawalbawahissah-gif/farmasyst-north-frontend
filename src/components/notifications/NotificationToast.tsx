import { X, Bell } from 'lucide-react';
import { useNotifications } from '../../lib/notification-context';
import type { Notification } from '../../types';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  high:   '#ea580c',
  medium: '#2D4A1E',
  low:    '#6b7280',
};

const PRIORITY_BG: Record<string, string> = {
  urgent: '#fef2f2',
  high:   '#fff7ed',
  medium: '#f0fdf4',
  low:    '#f9fafb',
};

export default function NotificationToast() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 360,
      width: 'calc(100vw - 40px)',
      pointerEvents: 'none',
    }}>
      {toasts.map(notif => (
        <ToastCard key={notif.id} notif={notif} onDismiss={() => dismissToast(notif.id)} />
      ))}
    </div>
  );
}

function ToastCard({ notif, onDismiss }: { notif: Notification; onDismiss: () => void }) {
  const priority = notif.priority ?? 'medium';
  const color    = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
  const bg       = PRIORITY_BG[priority]    ?? PRIORITY_BG.medium;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
        border: `1px solid ${color}30`,
        borderLeft: `4px solid ${color}`,
        padding: '12px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        pointerEvents: 'all',
        animation: 'toastIn 0.3s ease',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Bell size={14} color={color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: '#1a1a1a', lineHeight: 1.3 }}>
          {notif.title}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.45 }}>
          {notif.message ?? notif.body}
        </p>
      </div>

      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 2, flexShrink: 0, color: '#aaa',
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
