import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import type { Farm, FarmAuditReport, FarmerProfile } from '../../types';
import { adminService } from '../../lib/services/admin';
import { toArray } from '../../lib/api';
import { useAuth } from '../../lib/hooks/useAuth';
import { ChevronRight } from 'lucide-react';
import '../admin/admin.css';

const OUTCOME_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  satisfactory: 'success', concerns: 'warning', unsatisfactory: 'danger',
};

export default function MODashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const farms     = useAsync(() => farmsService.list(), []);
  const audits    = useAsync(() => farmsService.listAudits(), []);
  const profiles  = useAsync(() => adminService.listFarmerProfiles(), []);

  const allFarms   = toArray<Farm>(farms.data);
  const allAudits  = toArray<FarmAuditReport>(audits.data);
  const allProfiles = toArray<FarmerProfile>(profiles.data);

  // Officer's own reports
  const myAudits = allAudits.filter(a => a.auditor === user?.id);
  const recentAudits = [...myAudits].sort(
    (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
  ).slice(0, 5);

  // Farms audited vs not audited by this officer
  const auditedFarmIds = new Set(myAudits.map(a => a.farm));
  const unauditedFarms = allFarms.filter(f => !auditedFarmIds.has(f.id));

  // Concerns that need follow-up
  const needsAttention = myAudits.filter(a => a.outcome === 'concerns' || a.outcome === 'unsatisfactory');

  const pendingProfiles = allProfiles.filter((p) =>
    p.verification_status === 'pending' || !p.verification_status
  ).length;

  const greeting = user ? (user.full_name ?? user.first_name ?? 'Officer') : 'Officer';

  return (
    <div>
      <PageHeader
        title={`Hello, ${greeting} 📋`}
        subtitle="Monitor farm operations, compliance, and farmer activity across the platform."
      />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Total Farms"        value={allFarms.length}        sub="All registered farms"         accent="#1A4A6B" />
        <StatCard label="Active Farms"       value={allFarms.filter(f => f.is_active).length} sub="Currently operating" accent="#4A7C2F" />
        <StatCard label="Total Flock"        value={allFarms.reduce((s, f) => s + (f.flock_size || 0), 0).toLocaleString()} sub="Birds across all farms" accent="#E8A020" />
        <StatCard label="Pending Profiles"   value={pendingProfiles}        sub="Awaiting verification"        accent="#C0392B" />
      </div>

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="My Reports"         value={myAudits.length}        sub="Submitted by you"             accent="#1A6B5A" />
        <StatCard label="Satisfactory"       value={myAudits.filter(a => a.outcome === 'satisfactory').length} sub="Passed visits" accent="#4A7C2F" />
        <StatCard label="Needs Follow-up"    value={needsAttention.length}  sub="Concerns or unsatisfactory"   accent="#E8A020" />
        <StatCard label="Not Yet Audited"    value={unauditedFarms.length}  sub="Farms awaiting your visit"    accent="#5C2D8B" />
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <SectionTitle>Quick Actions</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 'var(--sp-md)', marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Submit Field Report', sub: 'Log a new farm visit', icon: '📝', path: '/monitoring_officer/report', accent: '#4A7C2F' },
          { label: 'View All Farms',      sub: 'Browse farm details',  icon: '🏡', path: '/monitoring_officer/farms',  accent: '#1A4A6B' },
          { label: 'Farmer Profiles',     sub: 'Check verification',   icon: '👨‍🌾', path: '/monitoring_officer/farmers', accent: '#E8A020' },
        ].map(a => (
          <Card
            key={a.label}
            style={{ cursor: 'pointer', borderLeft: `4px solid ${a.accent}`, padding: 'var(--sp-md)' }}
            onClick={() => navigate(a.path)}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{a.label}</div>
            <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>{a.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-lg)' }}>

        {/* ── My recent reports ──────────────────────────────────────────── */}
        <div>
          <SectionTitle>My Recent Reports</SectionTitle>
          <Card>
            {audits.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : recentAudits.length === 0 ? (
              <div style={{ padding: 'var(--sp-md)' }}>
                <p style={{ color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>No reports submitted yet.</p>
                <Button size="sm" onClick={() => navigate('/monitoring_officer/report')}>Submit First Report</Button>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Farm</th><th>Date</th><th>Outcome</th><th></th></tr></thead>
                <tbody>
                  {recentAudits.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.farm_name ?? r.farm}</strong></td>
                      <td style={{ fontSize: 12 }}>{new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><Badge variant={OUTCOME_BADGE[r.outcome]}>{r.outcome.replace('_', ' ')}</Badge></td>
                      <td>
                        <Button size="sm" variant="secondary" onClick={() => navigate('/monitoring_officer/report')}>
                          <ChevronRight size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* ── Farms needing a visit ──────────────────────────────────────── */}
        <div>
          <SectionTitle>Farms Awaiting Audit</SectionTitle>
          <Card>
            {farms.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : unauditedFarms.length === 0 ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>All farms have been audited. Great work! ✅</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Farm</th><th>Location</th><th>Flock</th><th></th></tr></thead>
                <tbody>
                  {unauditedFarms.slice(0, 6).map(f => (
                    <tr key={f.id}>
                      <td><strong>{f.name}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--col-muted)' }}>{f.district}, {f.region}</td>
                      <td>{f.flock_size?.toLocaleString()}</td>
                      <td>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/monitoring_officer/report?farm=${f.id}`)}
                        >
                          Audit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* ── Farms needing follow-up ────────────────────────────────────── */}
        {needsAttention.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <SectionTitle>⚠️ Follow-up Required</SectionTitle>
            <Card style={{ border: '1px solid #f9a825' }}>
              <table className="data-table">
                <thead><tr><th>Farm</th><th>Last Visit</th><th>Outcome</th><th>Summary</th><th></th></tr></thead>
                <tbody>
                  {needsAttention.slice(0, 5).map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.farm_name ?? r.farm}</strong></td>
                      <td style={{ fontSize: 12 }}>{new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><Badge variant={OUTCOME_BADGE[r.outcome]}>{r.outcome.replace('_', ' ')}</Badge></td>
                      <td style={{ fontSize: 12, color: 'var(--col-muted)', maxWidth: 200 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.summary}</span>
                      </td>
                      <td>
                        <Button size="sm" onClick={() => navigate(`/monitoring_officer/report?farm=${r.farm}`)}>
                          Re-audit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
