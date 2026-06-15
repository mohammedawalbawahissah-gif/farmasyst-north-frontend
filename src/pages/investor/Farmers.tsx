import { useState, useEffect } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Button, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { farmsService } from '../../lib/services/farms';
import type { Farm } from '../../types';
import { displayName, userId } from '../../types';
import { Search, X, MapPin } from 'lucide-react';
import './investor.css';

const FLOCK_TYPES = ['', 'broilers', 'layers', 'mixed', 'day_old_chicks', 'hatchery'];
const REGIONS = ['', 'Northern Region', 'Upper East Region', 'Upper West Region', 'Savannah Region'];

export default function BrowseFarmers() {
  const [search,       setSearch]  = useState('');
  const [flockFilter,  setFlock]   = useState('');
  const [regionFilter, setRegion]  = useState('');
  const [query,        setQuery]   = useState<Record<string, string>>({});
  const [selected,     setSelected] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const p: Record<string, string> = {};
      if (search)       p.search = search;
      if (regionFilter) p.region = regionFilter;
      setQuery(p);
    }, 350);
    return () => clearTimeout(t);
  }, [search, regionFilter]);

  const profiles = useAsync(() => adminService.listFarmerProfiles(query), [JSON.stringify(query)]);
  const farms    = useAsync(() => farmsService.list(), []);

  const allProfiles = toArray<any>(profiles.data);
  const farmMap     = Object.fromEntries(
    toArray<Farm>(farms.data).map(f => [userId(f.owner as any), f])
  );

  const filtered = allProfiles.filter((p: any) => {
    if (!flockFilter) return true;
    const farm = farmMap[userId(p.user)];
    return farm?.flock_type === flockFilter;
  });

  return (
    <div>
      <PageHeader
        title="Browse Farmers"
        subtitle="Discover verified farmer profiles and creditworthiness data."
      />

      <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
          <input
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Search by name or district…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={flockFilter} onChange={e => setFlock(e.target.value)} style={{ minWidth: 140 }}>
          {FLOCK_TYPES.map(t => <option key={t} value={t}>{t ? t.replace(/_/g, ' ') : 'All flock types'}</option>)}
        </select>
        <select value={regionFilter} onChange={e => setRegion(e.target.value)} style={{ minWidth: 180 }}>
          {REGIONS.map(r => <option key={r} value={r}>{r || 'All regions'}</option>)}
        </select>
      </div>

      {profiles.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading farmer profiles…</p>
      ) : profiles.error ? (
        <Card>
          <p style={{ padding: 'var(--sp-lg)', color: 'var(--col-danger)', textAlign: 'center' }}>
            Could not load farmer profiles. Your account may not have access to this section yet.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p style={{ padding: 'var(--sp-lg)', color: 'var(--col-muted)', textAlign: 'center' }}>
            No farmers match your filters.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--sp-md)' }}>
          {filtered.map((p: any) => {
            const farm     = farmMap[userId(p.user)];
            const name     = displayName(p.user) || `Farmer ${p.id}`;
            const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
            return (
              <Card key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-xs)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--col-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>{p.district}{p.region ? `, ${p.region}` : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-xs)', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--col-muted)' }}>Experience</span><br /><strong>{p.years_of_farming ?? '—'} yrs</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Credit score</span><br /><strong>{p.credit_score ?? '—'}</strong></div>
                  {farm && <>
                    <div><span style={{ color: 'var(--col-muted)' }}>Flock type</span><br /><strong style={{ textTransform: 'capitalize' }}>{farm.flock_type.replace(/_/g, ' ')}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Flock size</span><br /><strong>{farm.flock_size?.toLocaleString()}</strong></div>
                  </>}
                  <div>
                    <span style={{ color: 'var(--col-muted)' }}>Verification</span><br />
                    <Badge variant={p.verification_status === 'verified' ? 'success' : 'warning'}>
                      {p.verification_status ?? 'pending'}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" style={{ marginTop: 'auto' }} onClick={() => setSelected({ p, farm, name, initials })}>
                  View Full Profile
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Profile Modal ─────────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--sp-md)' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--sp-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--col-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                  {selected.initials}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{selected.name}</h3>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)', marginTop: 2 }}>
                    {selected.p.district}{selected.p.region ? `, ${selected.p.region}` : ''}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Badge variant={selected.p.verification_status === 'verified' ? 'success' : 'warning'}>
                      {selected.p.verification_status ?? 'pending'}
                    </Badge>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--col-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--col-muted)' }}>Community</span><br /><strong>{selected.p.community || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>GPS Address</span><br /><strong>{selected.p.gps_address || '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Farming Experience</span><br /><strong>{selected.p.years_of_farming ?? '—'} years</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Ghana Card</span><br /><strong>{selected.p.ghana_card_number || '—'}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Credit Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--col-muted)' }}>Credit Score</span><br /><strong style={{ fontSize: 24, color: 'var(--col-primary)' }}>{selected.p.credit_score ?? '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Last Updated</span><br /><strong>{selected.p.credit_score_updated_at ? new Date(selected.p.credit_score_updated_at).toLocaleDateString('en-GH') : '—'}</strong></div>
                </div>
                {selected.p.notes && <p style={{ marginTop: 'var(--sp-sm)', fontSize: 13, color: 'var(--col-muted)', fontStyle: 'italic' }}>{selected.p.notes}</p>}
              </div>

              {selected.farm && (
                <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Farm Details — {selected.farm.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', fontSize: 13 }}>
                    <div><span style={{ color: 'var(--col-muted)' }}>Flock Type</span><br /><strong style={{ textTransform: 'capitalize' }}>{selected.farm.flock_type.replace(/_/g, ' ')}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Flock Size</span><br /><strong>{selected.farm.flock_size?.toLocaleString()}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Farm Size</span><br /><strong>{selected.farm.farm_size_acres ? `${selected.farm.farm_size_acres} acres` : '—'}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Status</span><br /><Badge variant={selected.farm.is_active ? 'success' : 'neutral'}>{selected.farm.is_active ? 'Active' : 'Inactive'}</Badge></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Water Source</span><br /><strong>{selected.farm.has_water_source ? '✓ Yes' : '✗ No'}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Electricity</span><br /><strong>{selected.farm.has_electricity ? '✓ Yes' : '✗ No'}</strong></div>
                  </div>
                  <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--col-muted)' }}>
                    <MapPin size={12} /> {selected.farm.district}, {selected.farm.region}{selected.farm.community ? ` · ${selected.farm.community}` : ''}
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
