import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import type { Farm, FarmAuditReport } from '../../types';
import { toArray } from '../../lib/api';
import { Search, X, MapPin, Zap, Droplets } from 'lucide-react';
import '../admin/admin.css';

const FLOCK_BADGE: Record<string, 'success' | 'info' | 'neutral' | 'warning'> = {
  broilers: 'success', layers: 'info', mixed: 'neutral',
  day_old_chicks: 'warning', hatchery: 'info',
};
const OUTCOME_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  satisfactory: 'success', concerns: 'warning', unsatisfactory: 'danger',
};

export default function MOFarms() {
  const navigate  = useNavigate();
  const farms     = useAsync(() => farmsService.list(), []);
  const audits    = useAsync(() => farmsService.listAudits(), []);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Farm | null>(null);

  const allFarms  = toArray<Farm>(farms.data);
  const allAudits = toArray<FarmAuditReport>(audits.data);

  // Latest audit per farm
  const latestByFarm: Record<string, FarmAuditReport> = {};
  allAudits.forEach(a => {
    if (!latestByFarm[a.farm] || new Date(a.visit_date) > new Date(latestByFarm[a.farm].visit_date))
      latestByFarm[a.farm] = a;
  });
  // All audits per farm (for history panel)
  const historyByFarm: Record<string, FarmAuditReport[]> = {};
  allAudits.forEach(a => {
    if (!historyByFarm[a.farm]) historyByFarm[a.farm] = [];
    historyByFarm[a.farm].push(a);
  });

  const filtered = allFarms.filter(f => {
    const s = search.toLowerCase();
    return !s || f.name.toLowerCase().includes(s) || f.district.toLowerCase().includes(s)
      || f.region.toLowerCase().includes(s) || f.flock_type?.toLowerCase().includes(s);
  });

  const active   = allFarms.filter(f => f.is_active).length;
  const inactive = allFarms.length - active;
  const totalFlock = allFarms.reduce((s, f) => s + (f.flock_size || 0), 0);

  return (
    <div>
      <PageHeader title="Farm Monitoring" subtitle="View and monitor all registered farms on the platform." />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Total Farms"  value={allFarms.length} sub="All registered"        accent="#1A4A6B" />
        <StatCard label="Active"       value={active}          sub="Currently operating"   accent="#4A7C2F" />
        <StatCard label="Inactive"     value={inactive}        sub="Not operating"          accent="#C0392B" />
        <StatCard label="Total Flock"  value={totalFlock.toLocaleString()} sub="Birds across all farms" accent="#E8A020" />
      </div>

      <div style={{ position: 'relative', maxWidth: 500, marginBottom: 'var(--sp-lg)' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
        <input style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by name, district, region, or farm type…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <SectionTitle>All Farms ({filtered.length})</SectionTitle>
      <Card>
        {farms.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading farms…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farms found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Farm Name</th><th>Location</th><th>Farm Type</th><th>Flock Size</th><th>Utilities</th><th>Last Audit</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const last = latestByFarm[f.id];
                return (
                  <tr key={f.id}>
                    <td><strong>{f.name}</strong></td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} color="var(--col-muted)" />
                        {f.district}, {f.region}{f.community ? ` · ${f.community}` : ''}
                      </div>
                    </td>
                    <td><Badge variant={FLOCK_BADGE[f.flock_type] ?? 'neutral'}>{f.flock_type?.replace(/_/g, ' ')}</Badge></td>
                    <td><strong>{f.flock_size?.toLocaleString()}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span title="Water source" style={{ padding: '2px 6px', borderRadius: 12, background: f.has_water_source ? '#e8f5e9' : '#fafafa', fontSize: 16 }}>
                          <Droplets size={14} color={f.has_water_source ? '#2e7d32' : '#ccc'} />
                        </span>
                        <span title="Electricity" style={{ padding: '2px 6px', borderRadius: 12, background: f.has_electricity ? '#fff8e1' : '#fafafa', fontSize: 16 }}>
                          <Zap size={14} color={f.has_electricity ? '#f9a825' : '#ccc'} />
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {last ? (
                        <>
                          <div>{new Date(last.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <Badge variant={OUTCOME_BADGE[last.outcome]}>{last.outcome.replace('_', ' ')}</Badge>
                        </>
                      ) : <span style={{ color: 'var(--col-muted)' }}>Not audited</span>}
                    </td>
                    <td><Badge variant={f.is_active ? 'success' : 'neutral'}>{f.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="sm" onClick={() => setSelected(f)}>Details</Button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/monitoring_officer/report?farm=${f.id}`)}>Audit</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Farm Detail Panel ──────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--sp-md)' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--sp-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-lg)' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selected.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--col-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {selected.district}, {selected.region}{selected.community ? ` · ${selected.community}` : ''}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
              {/* Farm details */}
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Farm Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--col-muted)' }}>Flock Type</span><br /><strong style={{ textTransform: 'capitalize' }}>{selected.flock_type?.replace(/_/g, ' ')}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Flock Size</span><br /><strong>{selected.flock_size?.toLocaleString()}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Farm Size</span><br /><strong>{selected.farm_size_acres ? `${selected.farm_size_acres} acres` : '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>GPS</span><br /><strong style={{ fontSize: 11 }}>{selected.gps_address || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Water Source</span><br /><strong>{selected.has_water_source ? '✓ Yes' : '✗ No'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Electricity</span><br /><strong>{selected.has_electricity ? '✓ Yes' : '✗ No'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Status</span><br /><Badge variant={selected.is_active ? 'success' : 'neutral'}>{selected.is_active ? 'Active' : 'Inactive'}</Badge></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Registered</span><br /><strong>{selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-GH') : '—'}</strong></div>
                </div>
              </div>

              {/* Audit history */}
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>
                  Audit History ({(historyByFarm[selected.id] ?? []).length} visits)
                </div>
                {(historyByFarm[selected.id] ?? []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--col-muted)' }}>No audits yet for this farm.</p>
                ) : (
                  <table className="data-table" style={{ background: 'transparent' }}>
                    <thead><tr><th>Date</th><th>Outcome</th><th>Infra</th><th>Mgmt</th><th>Bio</th><th>Flock Verified</th></tr></thead>
                    <tbody>
                      {[...historyByFarm[selected.id]].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()).map(r => (
                        <tr key={r.id}>
                          <td style={{ fontSize: 12 }}>{new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td><Badge variant={OUTCOME_BADGE[r.outcome]}>{r.outcome.replace('_', ' ')}</Badge></td>
                          <td style={{ textAlign: 'center' }}>{r.infrastructure_score}/10</td>
                          <td style={{ textAlign: 'center' }}>{r.management_score}/10</td>
                          <td style={{ textAlign: 'center' }}>{r.biosecurity_score}/10</td>
                          <td style={{ textAlign: 'center' }}>{r.flock_verified?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 'var(--sp-lg)' }}>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              <Button onClick={() => { setSelected(null); navigate(`/monitoring_officer/report?farm=${selected.id}`); }}>
                Submit Audit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
