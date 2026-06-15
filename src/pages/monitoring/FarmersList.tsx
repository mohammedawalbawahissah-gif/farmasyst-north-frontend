import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { farmsService } from '../../lib/services/farms';
import type { Farm } from '../../types';
import { toArray } from '../../lib/api';
import { displayName, userId } from '../../types';
import { Search, X, MapPin } from 'lucide-react';
import '../admin/admin.css';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  verified: 'success', pending: 'warning', unverified: 'neutral', rejected: 'danger',
};

export default function MOFarmersList() {
  const profiles = useAsync(() => adminService.listFarmerProfiles(), []);
  const farms    = useAsync(() => farmsService.list(), []);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('');
  const [selected, setSelected] = useState<any>(null);

  const allProfiles = toArray<any>(profiles.data);
  const farmMap     = Object.fromEntries(toArray<Farm>(farms.data).map(f => [userId(f.owner as any), f]));

  const filtered = allProfiles.filter((p: any) => {
    const name = displayName(p.user) || p.user?.email || '';
    const s    = search.toLowerCase();
    const matchS = !s || name.toLowerCase().includes(s) || (p.district ?? '').toLowerCase().includes(s) || (p.region ?? '').toLowerCase().includes(s);
    const matchF = !filter || (p.verification_status ?? 'pending') === filter;
    return matchS && matchF;
  });

  const verified   = allProfiles.filter((p: any) => p.verification_status === 'verified').length;
  const pending    = allProfiles.filter((p: any) => !p.verification_status || p.verification_status === 'pending').length;

  return (
    <div>
      <PageHeader title="Farmer Monitoring" subtitle="View and monitor all registered farmers on the platform." />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Total Farmers" value={allProfiles.length} sub="All registered"       accent="#1A4A6B" />
        <StatCard label="Verified"      value={verified}           sub="Profile approved"      accent="#4A7C2F" />
        <StatCard label="Pending"       value={pending}            sub="Awaiting verification" accent="#E8A020" />
        <StatCard label="With Farms"    value={Object.keys(farmMap).length} sub="Have registered farms" accent="#5C2D8B" />
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
          <input style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by name, region, or district…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      <SectionTitle>All Farmers ({filtered.length})</SectionTitle>
      <Card>
        {profiles.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farmers found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Region</th><th>District</th><th>Years Farming</th><th>Credit Score</th><th>Farm</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const name = displayName(p.user) || p.user?.email || `Farmer ${p.id}`;
                const farm = farmMap[userId(p.user)];
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--col-muted)' }}>{p.user?.email}</div>
                    </td>
                    <td>{p.region || '—'}</td>
                    <td>{p.district || '—'}</td>
                    <td>{p.years_of_farming ?? 0} yrs</td>
                    <td>
                      <span style={{ fontWeight: 600, color: parseFloat(p.credit_score) >= 70 ? '#4A7C2F' : parseFloat(p.credit_score) >= 50 ? '#E8A020' : 'var(--col-muted)' }}>
                        {parseFloat(p.credit_score ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {farm
                        ? <><strong style={{ fontSize: 12 }}>{farm.name}</strong><div style={{ fontSize: 11, color: 'var(--col-muted)' }}>{farm.flock_type?.replace(/_/g, ' ')} · {farm.flock_size?.toLocaleString()}</div></>
                        : <span style={{ color: 'var(--col-muted)', fontSize: 12 }}>No farm</span>}
                    </td>
                    <td>
                      <Badge variant={STATUS_BADGE[p.verification_status ?? 'pending']}>
                        {p.verification_status ?? 'pending'}
                      </Badge>
                    </td>
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => setSelected({ p, farm, name })}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Farmer Profile Modal ─────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--sp-md)' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--sp-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#4A7C2F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{selected.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>{selected.p.user?.email}</div>
                  <div style={{ marginTop: 4 }}>
                    <Badge variant={STATUS_BADGE[selected.p.verification_status ?? 'pending']}>
                      {selected.p.verification_status ?? 'pending'}
                    </Badge>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--col-muted)' }}>Community</span><br /><strong>{selected.p.community || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>GPS Address</span><br /><strong style={{ fontSize: 11 }}>{selected.p.gps_address || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Years Farming</span><br /><strong>{selected.p.years_of_farming ?? 0} years</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Ghana Card</span><br /><strong style={{ fontSize: 11 }}>{selected.p.ghana_card_number || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Region</span><br /><strong>{selected.p.region || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>District</span><br /><strong>{selected.p.district || '—'}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Credit Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--col-muted)' }}>Credit Score</span><br />
                    <strong style={{ fontSize: 22, color: parseFloat(selected.p.credit_score ?? 0) >= 70 ? '#4A7C2F' : '#E8A020' }}>
                      {parseFloat(selected.p.credit_score ?? 0).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--col-muted)' }}>Last Updated</span><br />
                    <strong>{selected.p.credit_score_updated_at ? new Date(selected.p.credit_score_updated_at).toLocaleDateString('en-GH') : '—'}</strong>
                  </div>
                </div>
                {selected.p.notes && <p style={{ marginTop: 'var(--sp-sm)', fontSize: 13, color: 'var(--col-muted)', fontStyle: 'italic' }}>{selected.p.notes}</p>}
              </div>

              {selected.farm && (
                <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>
                    Farm — {selected.farm.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                    <div><span style={{ color: 'var(--col-muted)' }}>Flock Type</span><br /><strong style={{ textTransform: 'capitalize' }}>{selected.farm.flock_type?.replace(/_/g, ' ')}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Flock Size</span><br /><strong>{selected.farm.flock_size?.toLocaleString()}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Water Source</span><br /><strong>{selected.farm.has_water_source ? '✓ Yes' : '✗ No'}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Electricity</span><br /><strong>{selected.farm.has_electricity ? '✓ Yes' : '✗ No'}</strong></div>
                  </div>
                  <div style={{ marginTop: 'var(--sp-sm)', fontSize: 12, color: 'var(--col-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {selected.farm.district}, {selected.farm.region}
                  </div>
                </div>
              )}
            </div>

            <Button style={{ width: '100%', marginTop: 'var(--sp-lg)' }} onClick={() => setSelected(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
