/**
 * NotificationsPage (shared)
 * --------------------------
 * Renders the full-page notifications list for any role.
 * Cards are clickable and open NotificationDetail.
 *
 * Used by every role's Notifications.tsx:
 *   import NotificationsPage from '../shared/NotificationsPage';
 *   export default function FarmerNotifications() {
 *     return <NotificationsPage subtitle="Application updates, repayment reminders, and alerts." />;
 *   }
 */

import { useState } from 'react';
import { PageHeader, Card, Button, Badge } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { notificationsService } from '../../lib/services/notifications';
import { Bell } from 'lucide-react';
import type { Notification } from '../../types';
import NotificationDetail from '../../components/notifications/NotificationDetail';

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'info' | 'neutral'> = {
  urgent: 'danger', high: 'warning', medium: 'info', low: 'neutral',
};

interface Props {
  subtitle?: string;
}

export default function NotificationsPage({ subtitle = 'All notifications and platform alerts.' }: Props) {
  const notifs = useAsync(() => notificationsService.list(), []);
  const [selected, setSelected] = useState<Notification | null>(null);

  const handleMarkRead = async (id: string) => {
    await notificationsService.markRead(id);
    notifs.refetch();
  };

  const handleMarkAll = async () => {
    await notificationsService.markAllRead();
    notifs.refetch();
  };

  const handleCardClick = async (n: Notification) => {
    // Mark read silently if needed, then open detail
    if (!n.is_read) {
      await notificationsService.markRead(n.id);
      notifs.refetch();
    }
    setSelected(n);
  };

  const list   = toArray<Notification>(notifs.data);
  const unread = list.filter(n => !n.is_read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={subtitle}
        action={
          unread > 0
            ? <Button size="sm" variant="secondary" onClick={handleMarkAll}>Mark all read</Button>
            : undefined
        }
      />

      {/* Detail modal */}
      {selected && (
        <NotificationDetail
          notification={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {notifs.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading…</p>
      ) : list.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <Bell size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ color: 'var(--col-muted)' }}>No notifications yet.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
          {list.map(n => (
            <div
              key={n.id}
              onClick={() => handleCardClick(n)}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) =>
                (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) =>
                (e.currentTarget.style.boxShadow = '')}
              style={{
                opacity: n.is_read ? 0.7 : 1,
                borderLeft: n.is_read ? undefined : '3px solid var(--col-primary)',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, opacity 0.15s',
                borderRadius: 'inherit',
              }}
            >
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 4, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{n.title}</strong>
                    {!n.is_read && <Badge variant="info">New</Badge>}
                    {n.priority && (
                      <Badge variant={PRIORITY_VARIANT[n.priority] ?? 'neutral'}>{n.priority}</Badge>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--col-muted)', margin: '0 0 4px', lineHeight: 1.5 }}>
                    {/* Show first 140 chars as preview, full text in modal */}
                    {(n.message ?? n.body ?? '').length > 140
                      ? (n.message ?? n.body ?? '').slice(0, 140) + '…'
                      : (n.message ?? n.body ?? '')}
                  </p>
                  <span style={{ fontSize: 12, color: 'var(--col-muted)', display: 'block' }}>
                    {new Date(n.created_at).toLocaleString('en-GH', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {/* Dismiss button — stops propagation so it doesn't open the modal */}
                {!n.is_read && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleMarkRead(n.id); }}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
