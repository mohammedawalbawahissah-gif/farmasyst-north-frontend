import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { notificationsService, CREDIT_ALERT_META } from '../../lib/services/notifications';
import { toArray } from '../../lib/api';
import { Bell, Send, RefreshCw } from 'lucide-react';
import './admin.css';

const PRIORITY_BADGE: Record<string,'danger'|'warning'|'info'|'neutral'> = {
  urgent: 'danger', high: 'warning', medium: 'info', low: 'neutral',
};

export default function AdminCreditAlerts() {
  const alerts = useAsync(() => notificationsService.listCreditAlerts(), []);
  const all    = toArray<any>(alerts.data);

  const unread   = all.filter(n => !n.is_read).length;
  const urgent   = all.filter(n => n.priority === 'urgent').length;

  const [sending, setSending]   = useState<string|null>(null);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

  const handleResend = async (id: string) => {
    setSending(id); setError(''); setSuccess('');
    try {
      await notificationsService.resendAlert(id);
      setSuccess('Notification resent successfully.');
    } catch { setError('Failed to resend notification.'); }
    finally { setSending(null); }
  };

  // Timeline of all credit workflow events for visual reference
  const TIMELINE_STEPS = [
    { event: 'application_submitted',    step: 1 },
    { event: 'application_under_review', step: 2 },
    { event: 'application_scored',       step: 3 },
    { event: 'application_approved',     step: 4 },
    { event: 'investor_matched',         step: 5 },
    { event: 'investor_accepted',        step: 6 },
    { event: 'agreement_created',        step: 7 },
    { event: 'agreement_signed_farmer',  step: 8 },
    { event: 'agreement_signed_investor',step: 9 },
    { event: 'disbursement_requested',   step: 10 },
    { event: 'disbursement_approved',    step: 11 },
    { event: 'funds_disbursed',          step: 12 },
    { event: 'repayment_due',            step: 13 },
    { event: 'repayment_received',       step: 14 },
  ];

  return (
    <div>
      <PageHeader
        title="Credit Workflow Alerts"
        subtitle="All notification events across the disbursement lifecycle — from application to repayment."
        action={
          <Button size="sm" variant="secondary" onClick={() => { alerts.refetch(); setSuccess(''); setError(''); }}>
            <RefreshCw size={14}/> Refresh
          </Button>
        }
      />

      {success && <div style={{ background:'var(--col-success-bg)', color:'var(--col-success)', padding:'var(--sp-sm) var(--sp-md)', borderRadius:8, marginBottom:'var(--sp-md)', fontSize:13 }}>{success}</div>}
      {error   && <div style={{ background:'var(--col-danger-bg)',  color:'var(--col-danger)',  padding:'var(--sp-sm) var(--sp-md)', borderRadius:8, marginBottom:'var(--sp-md)', fontSize:13 }}>{error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'var(--sp-md)', marginBottom:'var(--sp-lg)' }}>
        <StatCard label="Total Alerts"  value={all.length} icon={<Bell size={20}/>}     />
        <StatCard label="Unread"        value={unread}     icon={<Bell size={20}/>}     />
        <StatCard label="Urgent"        value={urgent}     icon={<Bell size={20}/>}     />
      </div>

      {/* Workflow timeline toggle */}
      <div style={{ marginBottom:'var(--sp-md)' }}>
        <Button size="sm" variant="secondary" onClick={() => setShowTimeline(t => !t)}>
          {showTimeline ? '▲ Hide' : '▼ Show'} Workflow Timeline
        </Button>
      </div>

      {showTimeline && (
        <Card style={{ marginBottom:'var(--sp-lg)', overflowX:'auto' }}>
          <SectionTitle>Credit Disbursement Alert Flow</SectionTitle>
          <p style={{ fontSize:13, color:'var(--col-muted)', marginBottom:'var(--sp-md)' }}>
            Every event below automatically sends notifications to the listed recipients.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
            {TIMELINE_STEPS.map(({ event, step }) => {
              const meta = CREDIT_ALERT_META[event];
              if (!meta) return null;
              return (
                <div key={event} style={{ display:'flex', alignItems:'flex-start', gap:'var(--sp-md)' }}>
                  <div style={{ minWidth:28, height:28, borderRadius:'50%', background:'var(--col-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                    {step}
                  </div>
                  <div style={{ flex:1, paddingBottom:'var(--sp-sm)', borderBottom:'1px solid var(--col-border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', flexWrap:'wrap' }}>
                      <span style={{ fontSize:16 }}>{meta.icon}</span>
                      <strong style={{ fontSize:13 }}>{meta.label}</strong>
                      <Badge variant={PRIORITY_BADGE[meta.priority]}>{meta.priority}</Badge>
                    </div>
                    <p style={{ fontSize:12, color:'var(--col-muted)', margin:'2px 0 0' }}>
                      Notifies: {meta.recipients.join(', ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <SectionTitle>Recent Credit Alerts</SectionTitle>
      {alerts.loading ? (
        <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      ) : all.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem' }}>
          <Bell size={32} style={{ opacity:.3, marginBottom:'1rem' }} />
          <p style={{ color:'var(--col-muted)' }}>No credit workflow alerts yet.</p>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
          {all.map(n => {
            const meta = CREDIT_ALERT_META[n.notification_type];
            return (
              <Card key={n.id} style={{ opacity: n.is_read ? .7 : 1, borderLeft: n.is_read ? undefined : `3px solid var(--col-primary)` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'var(--sp-md)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', flexWrap:'wrap', marginBottom:4 }}>
                      {meta && <span style={{ fontSize:15 }}>{meta.icon}</span>}
                      <strong style={{ fontSize:14 }}>{n.title}</strong>
                      {!n.is_read && <Badge variant="info">New</Badge>}
                      {n.priority && <Badge variant={PRIORITY_BADGE[n.priority] ?? 'neutral'}>{n.priority}</Badge>}
                    </div>
                    <p style={{ fontSize:13, color:'var(--col-muted)', margin:0 }}>{n.message}</p>
                    <span style={{ fontSize:12, color:'var(--col-muted)', marginTop:4, display:'block' }}>
                      {new Date(n.created_at).toLocaleString('en-GH', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={sending === n.id}
                    onClick={() => handleResend(n.id)}
                  >
                    <Send size={13}/> {sending === n.id ? '…' : 'Resend'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
