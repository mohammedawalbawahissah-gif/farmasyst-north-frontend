import { useState } from 'react';
import { PageHeader, Card, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { toArray } from '../../lib/api';
import type { FarmerProfile } from '../../types';
import { Search } from 'lucide-react';

export default function MonitoringFarmers() {
  const profiles = useAsync(() => adminService.listFarmerProfiles(), []);
  const [search, setSearch] = useState('');

  const all = toArray<FarmerProfile>(profiles.data);
  const filtered = all.filter(p => {
    const s = search.toLowerCase();
    const name = `${p.user?.first_name ?? ''} ${p.user?.last_name ?? ''}`.toLowerCase();
    return !s || name.includes(s) || (p.region ?? '').toLowerCase().includes(s)
      || (p.district ?? '').toLowerCase().includes(s);
  });

  const verified = all.filter(p => p.verification_status === 'verified').length;
  const pending  = all.filter(p => p.verification_status !== 'verified').length;

  return (
    <div>
      <PageHeader title="Farmer Monitoring" subtitle="View and monitor all registered farmers on the platform." />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Total Farmers', value: all.length,  color: '#1A4A6B' },
          { label: 'Verified',      value: verified,    color: '#4A7C2F' },
          { label: 'Pending',       value: pending,     color: '#E8A020' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--col-border)', borderRadius: 8, padding: 'var(--sp-md)' }}>
            <div style={{ fontSize: 12, color: 'var(--col-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 'var(--sp-lg)' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
        <input style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by name, region, or district…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <SectionTitle>All Farmers</SectionTitle>
      <Card>
        {profiles.loading
          ? <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
          : filtered.length === 0
          ? <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farmers found.</p>
          : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Region</th><th>District</th><th>Years Farming</th><th>Credit Score</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const name = `${p.user?.first_name ?? ''} ${p.user?.last_name ?? ''}`.trim() || `Farmer ${p.id}`;
                  return (
                    <tr key={p.id}>
                      <td><strong>{name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>{p.user?.email}</div>
                      </td>
                      <td>{p.region || '—'}</td>
                      <td>{p.district || '—'}</td>
                      <td>{p.years_of_farming ?? '—'}</td>
                      <td>{p.credit_score ?? '—'}</td>
                      <td>
                        <Badge variant={p.verification_status === 'verified' ? 'success' : 'warning'}>
                          {p.verification_status ?? 'pending'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </Card>
    </div>
  );
}
