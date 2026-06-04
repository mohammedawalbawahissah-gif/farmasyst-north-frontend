import { PageHeader, Card, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { ClipboardList, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

const OUTCOME_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  satisfactory: 'success', concerns: 'warning', unsatisfactory: 'danger',
};

export default function MODashboard() {
  const { user } = useAuth();
  const farms  = useAsync(() => farmsService.list(), []);
  const audits = useAsync(() => farmsService.listAudits(), []);

  const allFarms  = toArray(farms.data);
  const allAudits = toArray(audits.data);

  // Only audits submitted by this officer
  const myAudits = allAudits.filter(a => a.auditor === user?.id || a.auditor_name);
  const recentAudits = [...allAudits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  const satisfactory   = allAudits.filter(a => a.outcome === 'satisfactory').length;
  const concerns       = allAudits.filter(a => a.outcome === 'concerns').length;
  const unsatisfactory = allAudits.filter(a => a.outcome === 'unsatisfactory').length;

  return (
    <div>
      <PageHeader
        title="Monitoring Dashboard"
        subtitle="Overview of your field visits, assigned farms, and submitted reports."
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-md)', marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Total Farms',       val: allFarms.length,    icon: MapPin,        col: '#1A4A6B' },
          { label: 'Reports Submitted', val: allAudits.length,   icon: ClipboardList, col: '#4A7C2F' },
          { label: 'Satisfactory',      val: satisfactory,       icon: CheckCircle,   col: '#4A7C2F' },
          { label: 'Needs Attention',   val: concerns + unsatisfactory, icon: AlertTriangle, col: '#E8A020' },
        ].map(({ label, val, icon: Icon, col }) => (
          <Card key={label} style={{ padding: 'var(--sp-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--col-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: col }}>{val}</div>
              </div>
              <Icon size={20} color={col} style={{ opacity: 0.6 }} />
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-lg)' }}>
        {/* Recent audit reports */}
        <div>
          <SectionTitle>Recent Audit Reports</SectionTitle>
          <Card>
            {audits.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : recentAudits.length === 0 ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>
                No reports yet. Use "Submit Report" to log your first field visit.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Farm</th><th>Date</th><th>Outcome</th></tr>
                </thead>
                <tbody>
                  {recentAudits.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.farm_name ?? r.farm}</strong></td>
                      <td>{new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <Badge variant={OUTCOME_BADGE[r.outcome]}>
                          {r.outcome.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Farms overview */}
        <div>
          <SectionTitle>Registered Farms</SectionTitle>
          <Card>
            {farms.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : allFarms.length === 0 ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farms registered yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Farm</th><th>Location</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {allFarms.slice(0, 8).map(f => (
                    <tr key={f.id}>
                      <td><strong>{f.name}</strong></td>
                      <td className="data-table__muted">{f.district}, {f.region}</td>
                      <td>
                        <Badge variant={f.is_active ? 'success' : 'neutral'}>
                          {f.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
