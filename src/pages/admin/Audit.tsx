import { PageHeader, Card, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import type { Farm, FarmAuditReport, User } from '../../types';
import { adminService } from '../../lib/services/admin';
import { toArray } from '../../lib/api';
import './admin.css';

const OUTCOME_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  satisfactory: 'success', concerns: 'warning', unsatisfactory: 'danger',
};

export default function AdminAudit() {
  const audits  = useAsync(() => farmsService.listAudits(), []);
  const farms   = useAsync(() => farmsService.list(), []);
  const officers = useAsync(() => adminService.listMonitoringOfficers(), []);

  const farmMap    = Object.fromEntries(toArray<Farm>(farms.data).map(f => [f.id, f]));
  const officerMap = Object.fromEntries(
    toArray<User>(officers.data).map(u => [u.id, u.full_name || `${u.first_name} ${u.last_name}`])
  );
  const all = toArray<FarmAuditReport>(audits.data);

  const avg = (field: 'infrastructure_score' | 'management_score' | 'biosecurity_score') =>
    all.length > 0 ? (all.reduce((s, r) => s + r[field], 0) / all.length).toFixed(1) : '—';

  const satisfactory   = all.filter(r => r.outcome === 'satisfactory').length;
  const concerns       = all.filter(r => r.outcome === 'concerns').length;
  const unsatisfactory = all.filter(r => r.outcome === 'unsatisfactory').length;

  return (
    <div>
      <PageHeader
        title="Audit & Compliance"
        subtitle="Field verification reports submitted by monitoring officers."
      />

      {/* ── Summary stats ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-md)', marginBottom: 'var(--sp-md)' }}>
        {[
          { label: 'Total Audits',        val: all.length,                          col: '#1A4A6B' },
          { label: 'Avg Infrastructure',  val: avg('infrastructure_score') + '/10', col: '#4A7C2F' },
          { label: 'Avg Management',      val: avg('management_score') + '/10',     col: '#E8A020' },
          { label: 'Avg Biosecurity',     val: avg('biosecurity_score') + '/10',    col: '#5C2D8B' },
        ].map(({ label, val, col }) => (
          <Card key={label} style={{ padding: 'var(--sp-md)' }}>
            <div style={{ fontSize: 12, color: 'var(--col-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{val}</div>
          </Card>
        ))}
      </div>

      {/* ── Outcome breakdown ────────────────────────────────────────────── */}
      {all.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-md)', marginBottom: 'var(--sp-xl)' }}>
          {[
            { label: 'Satisfactory',   val: satisfactory,   col: '#4A7C2F', bg: '#f0f7ec' },
            { label: 'Concerns Noted', val: concerns,       col: '#E8A020', bg: '#fdf6e3' },
            { label: 'Unsatisfactory', val: unsatisfactory, col: '#C0392B', bg: '#fdf0ef' },
          ].map(({ label, val, col, bg }) => (
            <Card key={label} style={{ padding: 'var(--sp-md)', background: bg, border: `1px solid ${col}22` }}>
              <div style={{ fontSize: 12, color: col, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: col }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                {all.length > 0 ? Math.round((val / all.length) * 100) : 0}% of all audits
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Reports table ────────────────────────────────────────────────── */}
      <SectionTitle>All Audit Reports ({all.length})</SectionTitle>
      <Card>
        {audits.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading audit records…</p>
        ) : all.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>
            No audit reports submitted yet. Monitoring officers can submit reports from their portal.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Farm</th>
                <th>Officer</th>
                <th>Visit Date</th>
                <th>Outcome</th>
                <th>Infra</th>
                <th>Mgmt</th>
                <th>Bio</th>
                <th>Flock Verified</th>
                <th>Summary</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {all.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.farm_name ?? farmMap[r.farm]?.name ?? r.farm}</strong></td>
                  <td className="data-table__muted">
                    {r.auditor_name ?? (r.auditor ? officerMap[r.auditor] : '—') ?? '—'}
                  </td>
                  <td>{new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <Badge variant={OUTCOME_BADGE[r.outcome]}>
                      {r.outcome.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>{r.infrastructure_score}/10</td>
                  <td>{r.management_score}/10</td>
                  <td>{r.biosecurity_score}/10</td>
                  <td>{r.flock_verified.toLocaleString()}</td>
                  <td style={{ maxWidth: 240 }}>
                    <span style={{ fontSize: 12, color: 'var(--col-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.summary || '—'}
                    </span>
                  </td>
                  <td>
                    {r.report_document
                      ? <a href={r.report_document} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View</a>
                      : <span style={{ color: 'var(--col-muted)', fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
