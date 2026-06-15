import { useState } from 'react';
import type { Farm } from '../../types';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { farmsService } from '../../lib/services/farms';
import { displayName } from '../../types';
import { MapPin, ClipboardList, User } from 'lucide-react';
import './admin.css';

export default function AdminMonitoring() {
  const officers = useAsync(() => adminService.listMonitoringOfficers(), []);
  const farms    = useAsync(() => farmsService.list(), []);
  const audits   = useAsync(() => farmsService.listAudits(), []);

  const [assigning, setAssigning] = useState<string | null>(null); // farm id being assigned
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assignMsg, setAssignMsg] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const officerList = toArray<any>(officers.data);
  const farmList    = toArray<Farm>(farms.data);
  const auditList   = toArray<any>(audits.data);

  // Count audits per officer
  const auditsByOfficer = auditList.reduce<Record<string, number>>((acc, a) => {
    if (a.auditor) acc[a.auditor] = (acc[a.auditor] ?? 0) + 1;
    return acc;
  }, {});

  // Most recent audit per farm
  const lastAuditByFarm = auditList.reduce<Record<string, any>>((acc, a) => {
    if (!acc[a.farm] || new Date(a.visit_date) > new Date(acc[a.farm].visit_date)) acc[a.farm] = a;
    return acc;
  }, {});

  const handleAssign = async () => {
    if (!assigning || !selectedOfficer) return;
    setAssignLoading(true); setAssignMsg('');
    try {
      await adminService.assignOfficerToFarm(assigning, selectedOfficer);
      setAssignMsg('Officer assigned successfully.');
      setAssigning(null); setSelectedOfficer('');
      farms.refetch();
    } catch {
      setAssignMsg('Assignment failed. The farm may not support this action yet.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassign = async (farmId: string) => {
    setAssignMsg('');
    try {
      await adminService.assignOfficerToFarm(farmId, '');
      setAssignMsg('Officer unassigned.');
      farms.refetch();
    } catch {
      setAssignMsg('Failed to unassign officer.');
    }
  };

  const handleRequestReport = async (farmId: string, officerId: string) => {
    setAssignMsg('');
    try {
      await adminService.requestAuditReport(farmId, officerId);
      setAssignMsg('Report request sent to the assigned officer.');
    } catch {
      setAssignMsg('Could not send report request. Please try again.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Monitoring Officers"
        subtitle="Manage field officers and their farm assignments."
      />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Total Officers"  value={officerList.length}   sub="Active in system"          accent="#1A6B5A" />
        <StatCard label="Total Farms"     value={farmList.length}      sub="Registered farms"          accent="#1A4A6B" />
        <StatCard label="Audit Reports"   value={auditList.length}     sub="All submitted reports"     accent="#4A7C2F" />
        <StatCard label="Farms Audited"   value={Object.keys(lastAuditByFarm).length} sub="At least once" accent="#E8A020" />
      </div>

      {assignMsg && (
        <p className={assignMsg.includes('success') ? 'form-success' : 'form-error'} style={{ marginBottom: 'var(--sp-md)' }}>
          {assignMsg}
        </p>
      )}

      {/* ── Officers list ───────────────────────────────────────────────────── */}
      <SectionTitle>Field Officers ({officerList.length})</SectionTitle>
      {officers.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading officers…</p>
      ) : officerList.length === 0 ? (
        <Card>
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>
            No monitoring officers registered yet. Create a user with the "monitoring_officer" role from Users management.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 'var(--sp-md)', marginBottom: 'var(--sp-xl)' }}>
          {officerList.map((o: any) => {
            const name     = displayName(o) || o.email;
            const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
            const count    = auditsByOfficer[o.id] ?? 0;

            return (
              <Card key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A6B5A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>{o.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-md)', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--col-muted)' }}>
                    <ClipboardList size={13} /> {count} audit{count !== 1 ? 's' : ''}
                  </div>
                  <div>
                    <Badge variant={o.is_active ? 'success' : 'neutral'}>
                      {o.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Farm assignments ─────────────────────────────────────────────────── */}
      <SectionTitle>Farm Assignments</SectionTitle>
      <Card>
        {farms.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading farms…</p>
        ) : farmList.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farms registered yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Farm</th>
                <th>Location</th>
                <th>Flock Type</th>
                <th>Last Audit</th>
                <th>Outcome</th>
                <th>Assigned Officer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {farmList.map(f => {
                return (
                  <tr key={f.id}>
                    <td><strong>{f.name}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} />{f.district}, {f.region}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{f.flock_type?.replace(/_/g, ' ') ?? '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {lastAuditByFarm[f.id]
                        ? new Date(lastAuditByFarm[f.id].visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span style={{ color: 'var(--col-muted)' }}>Never</span>}
                    </td>
                    <td>
                      {lastAuditByFarm[f.id] ? (
                        <Badge variant={lastAuditByFarm[f.id].outcome === 'satisfactory' ? 'success' : lastAuditByFarm[f.id].outcome === 'concerns' ? 'warning' : 'danger'}>
                          {lastAuditByFarm[f.id].outcome.replace('_', ' ')}
                        </Badge>
                      ) : <span style={{ color: 'var(--col-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {assigning === f.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            value={selectedOfficer}
                            onChange={e => setSelectedOfficer(e.target.value)}
                            style={{ fontSize: 12, padding: '4px 8px' }}
                          >
                            <option value="">— Select officer —</option>
                            {officerList.map((o: any) => (
                              <option key={o.id} value={o.id}>{displayName(o) || o.email}</option>
                            ))}
                          </select>
                          <Button size="sm" disabled={!selectedOfficer || assignLoading} onClick={handleAssign}>
                            {assignLoading ? '…' : 'Save'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => { setAssigning(null); setSelectedOfficer(''); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={12} style={{ color: 'var(--col-muted)' }} />
                          <span>{f.monitoring_officer_name ?? '—'}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {assigning !== f.id && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {f.monitoring_officer ? (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleUnassign(f.id)}
                                title="Remove assigned officer"
                              >
                                Unassign
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => f.monitoring_officer && handleRequestReport(f.id, f.monitoring_officer)}
                                title="Send report request to assigned officer"
                              >
                                Request Report
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => { setAssigning(f.id); setSelectedOfficer(''); setAssignMsg(''); }}>
                              Assign Officer
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
