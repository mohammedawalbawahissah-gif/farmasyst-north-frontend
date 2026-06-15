import { Users, FileCheck, AlertCircle, TrendingUp, BarChart3, UserCheck } from 'lucide-react';
import { PageHeader, StatCard, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { creditService } from '../../lib/services/credit';
import { paymentsService } from '../../lib/services/payments';
import { notificationsService } from '../../lib/services/notifications';
import { toArray } from '../../lib/api';
import { displayName } from '../../types';
import '../farmer/farmer.css';
import './admin.css';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  submitted: 'info', under_review: 'warning', scored: 'warning',
  matched: 'info', approved: 'success', disbursed: 'success', rejected: 'danger',
};

export default function AdminDashboard() {
  const users    = useAsync(() => adminService.listUsers(), []);
  const apps     = useAsync(() => creditService.listApps(), []);
  const notifs   = useAsync(() => notificationsService.list(), []);
  const disbReqs = useAsync(() => paymentsService.listDisbursementRequests(), []);

  const allUsers  = toArray<any>(users.data);
  const allApps   = toArray<any>(apps.data);
  const allNotifs = toArray<any>(notifs.data);
  const allDisbReqs = toArray<any>(disbReqs.data);

  const pending         = allApps.filter(a => ['submitted', 'under_review', 'scored'].includes(a.status));
  const pendingDisbReqs = allDisbReqs.filter(r => r.status === 'pending');
  const farmers   = allUsers.filter(u => u.role === 'farmer');
  const investors = allUsers.filter(u => u.role === 'investor');
  const unread    = allNotifs.filter(n => !n.is_read).length;

  const anyError = users.error || apps.error || notifs.error;

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        subtitle="FarmAsyst North admin panel — manage credit, users, and operations."
      />

      {anyError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)',
          padding: '10px 14px', marginBottom: 'var(--sp-lg)', fontSize: 13, color: '#b91c1c',
        }}>
          ⚠️ Some data could not be loaded: {users.error ?? apps.error ?? notifs.error}
        </div>
      )}

      {pendingDisbReqs.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius-sm)',
          padding: '12px 16px', marginBottom: 'var(--sp-lg)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-sm)', flexWrap: 'wrap',
        }}>
          <div style={{fontSize:13}}>
            💸 <strong>{pendingDisbReqs.length} disbursement request{pendingDisbReqs.length > 1 ? 's' : ''}</strong> awaiting your review —
            totalling <strong>GHS {pendingDisbReqs.reduce((s,r) => s + parseFloat(r.amount), 0).toLocaleString()}</strong>
          </div>
          <Button size="sm" onClick={() => window.location.href = '/admin/disbursements'}>
            Review Requests →
          </Button>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Total Farmers"   value={users.loading ? '…' : farmers.length}   sub={`${farmers.filter(u => u.is_verified).length} verified`}    icon={<Users size={16} />}       accent="#5C2D8B" />
        <StatCard label="Total Investors" value={users.loading ? '…' : investors.length} sub="Registered partners"                                         icon={<TrendingUp size={16} />}  accent="#1A4A6B" />
        <StatCard label="Pending Review"  value={apps.loading  ? '…' : pending.length}   sub="Applications awaiting"                                       icon={<FileCheck size={16} />}   accent="#E8A020" />
        <StatCard label="Unread Alerts"   value={notifs.loading ? '…' : unread}          sub="Platform notifications"                                      icon={<AlertCircle size={16} />} accent="#C0392B" />
      </div>

      <div className="admin-grid-main">
        <div>
          <SectionTitle>Pending Credit Applications</SectionTitle>
          <Card>
            {apps.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : apps.error ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-danger)' }}>Failed to load: {apps.error}</p>
            ) : pending.length === 0 ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No pending applications.</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Ref</th><th>Farmer</th><th>Type</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead>
                <tbody>
                  {pending.slice(0, 8).map(app => (
                    <tr key={app.id}>
                      <td className="data-table__mono">{app.reference}</td>
                      <td><strong>{displayName(app.farmer)}</strong></td>
                      <td>{app.credit_type}</td>
                      <td>{app.amount_requested ? `GHS ${parseFloat(app.amount_requested).toLocaleString()}` : 'Free'}</td>
                      <td><Badge variant={STATUS_BADGE[app.status] ?? 'neutral'}>{app.status.replace(/_/g, ' ')}</Badge></td>
                      <td className="data-table__muted">{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GH') : '—'}</td>
                      <td><Button size="sm" onClick={() => window.location.href = '/admin/credit'}>Review</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div>
          <SectionTitle>Platform Health</SectionTitle>
          <Card>
            <div className="health-row"><BarChart3 size={16} /><span>Total Applications</span><strong>{apps.loading ? '…' : allApps.length}</strong></div>
            <div className="health-row"><UserCheck size={16} /><span>Verified Farmers</span><strong>{farmers.filter(u => u.is_verified).length} / {farmers.length}</strong></div>
            <div className="health-row"><Users size={16} /><span>Active Investors</span><strong>{investors.length}</strong></div>
            <div className="health-row"><FileCheck size={16} /><span>Approved Apps</span><strong>{allApps.filter(a => ['approved', 'disbursed'].includes(a.status)).length}</strong></div>
            <div className="health-row"><AlertCircle size={16} /><span>Rejected Apps</span><strong style={{ color: 'var(--col-danger)' }}>{allApps.filter(a => a.status === 'rejected').length}</strong></div>
          </Card>

          <SectionTitle style={{ marginTop: 'var(--sp-lg)' }}>User Breakdown</SectionTitle>
          <Card>
            {(['farmer', 'investor', 'consumer', 'admin'] as const).map(role => (
              <div key={role} className="repayment-row">
                <span style={{ textTransform: 'capitalize' }}>{role}s</span>
                <strong>{users.loading ? '…' : allUsers.filter(u => u.role === role).length}</strong>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
