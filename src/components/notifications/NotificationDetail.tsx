/**
 * NotificationDetail
 * ------------------
 * A modal that renders a single notification in a full readable format.
 * Shared by:
 *   - NotificationBell (inline dropdown click)
 *   - All role Notifications pages (card click)
 *
 * Usage:
 *   <NotificationDetail notification={n} onClose={() => setSelected(null)} />
 */

import { X } from 'lucide-react';
import type { Notification } from '../../types';

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  urgent: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Urgent'  },
  high:   { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', label: 'High'    },
  medium: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Medium'  },
  low:    { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb', label: 'Low'     },
};

const TYPE_ICONS: Record<string, string> = {
  application_submitted:     '📝',
  application_under_review:  '🔍',
  application_scored:        '📊',
  application_approved:      '✅',
  application_rejected:      '❌',
  investor_matched:          '🤝',
  investor_accepted:         '🎉',
  investor_declined:         '↩️',
  agreement_created:         '📄',
  agreement_signed_farmer:   '✍️',
  agreement_signed_investor: '✍️',
  disbursement_requested:    '💸',
  disbursement_approved:     '✅',
  disbursement_rejected:     '🚫',
  funds_disbursed:           '🏦',
  repayment_due:             '📅',
  repayment_received:        '💰',
  repayment_overdue:         '⚠️',
  order_placed:              '🛒',
  momo_prompt_sent:          '📱',
  order_delivered:           '📦',
};

function iconFor(n: Notification): string {
  const t = n.notification_type ?? n.notif_type ?? '';
  return TYPE_ICONS[t] ?? '🔔';
}

interface Props {
  notification: Notification;
  onClose: () => void;
}

export default function NotificationDetail({ notification: n, onClose }: Props) {
  const priority = n.priority ?? 'medium';
  const pc       = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
  const body     = n.message ?? n.body ?? '';

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      onKeyDown={handleKey}
      tabIndex={-1}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--col-surface, #fff)',
        borderRadius: 16,
        boxShadow: '0 16px 60px rgba(0,0,0,0.25)',
        border: '1px solid var(--col-border, #e8e4dc)',
        width: '100%',
        maxWidth: 520,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--col-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: pc.bg, border: `1px solid ${pc.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            {iconFor(n)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--col-text)',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {n.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {/* Priority badge */}
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.5,
                padding: '2px 8px', borderRadius: 10,
                background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`,
              }}>
                {pc.label}
              </span>
              {/* Read/Unread indicator */}
              {!n.is_read && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 10,
                  background: '#eff6ff', color: '#2563eb',
                  border: '1px solid #bfdbfe',
                }}>
                  New
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--col-muted)', padding: 6,
              display: 'flex', alignItems: 'center', borderRadius: 6,
              flexShrink: 0,
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 20px 24px' }}>
          {/* Message */}
          <div style={{
            fontSize: 14,
            color: 'var(--col-text)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 20,
          }}>
            {body || <em style={{ color: 'var(--col-muted)' }}>No message body.</em>}
          </div>

          {/* Meta row */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--col-border)',
          }}>
            <MetaItem label="Received">
              {new Date(n.created_at).toLocaleString('en-GH', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </MetaItem>

            {(n.notification_type ?? n.notif_type) && (
              <MetaItem label="Type">
                {(n.notification_type ?? n.notif_type ?? '').replace(/_/g, ' ')}
              </MetaItem>
            )}

            {n.related_object_type && (
              <MetaItem label="Related to">
                {n.related_object_type.replace(/_/g, ' ')}
                {n.related_object_id ? ` #${n.related_object_id}` : ''}
              </MetaItem>
            )}

            {/* Extra data fields if present */}
            {n.data && Object.keys(n.data).length > 0 &&
              Object.entries(n.data)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .slice(0, 4)
                .map(([k, v]) => (
                  <MetaItem key={k} label={k.replace(/_/g, ' ')}>
                    {String(v)}
                  </MetaItem>
                ))
            }
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--col-border)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid var(--col-border)',
              background: 'var(--col-surface)',
              color: 'var(--col-text)',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--col-muted)', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--col-text)', textTransform: 'capitalize' }}>
        {children}
      </p>
    </div>
  );
}
