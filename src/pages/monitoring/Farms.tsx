import { useState } from 'react';
import { PageHeader, Card, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import { Search } from 'lucide-react';
import '../admin/admin.css';

const FLOCK_BADGE: Record<string, 'success' | 'info' | 'neutral' | 'warning'> = {
  broilers:       'success',
  layers:         'info',
  mixed:          'neutral',
  day_old_chicks: 'warning',
  hatchery:       'info',
};

export default function MOFarms() {
  const farms  = useAsync(() => farmsService.list(), []);
  const audits = useAsync(() => farmsService.listAudits(), []);
  const [search, setSearch] = useState('');

  const allFarms  = toArray(farms.data);
  const allAudits = toArray(audits.data);

  // Map farmId → most recent audit
  const latestAuditByFarm: Record<string, typeof allAudits[0]> = {};
  allAudits.forEach(a => {
    if (!latestAuditByFarm[a.farm] ||
        new Date(a.visit_date) > new Date(latestAuditByFarm[a.farm].visit_date)) {
      latestAuditByFarm[a.farm] = a;
    }
  });

  const filtered = allFarms.filter(f => {
    const s = search.toLowerCase();
    return !s
      || f.name.toLowerCase().includes(s)
      || f.district.toLowerCase().includes(s)
      || f.region.toLowerCase().includes(s);
  });

  return (
    <div>
      <PageHeader title="All Farms" subtitle="View all registered farms and their latest audit status." />

      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 'var(--sp-lg)' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
        <input
          style={{ paddingLeft: 32, width: '100%' }}
          placeholder="Search by farm name, district, region…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <SectionTitle>Registered Farms ({filtered.length})</SectionTitle>
      <Card>
        {farms.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading farms…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farms found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Farm</th>
                <th>Location</th>
                <th>Flock Type</th>
                <th>Flock Size</th>
                <th>Status</th>
                <th>Last Audit</th>
                <th>Last Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const last = latestAuditByFarm[f.id];
                return (
                  <tr key={f.id}>
                    <td><strong>{f.name}</strong></td>
                    <td className="data-table__muted">{f.district}, {f.region}</td>
                    <td>
                      <Badge variant={FLOCK_BADGE[f.flock_type] ?? 'neutral'}>
                        {f.flock_type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td><strong>{f.flock_size.toLocaleString()}</strong></td>
                    <td>
                      <Badge variant={f.is_active ? 'success' : 'neutral'}>
                        {f.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="data-table__muted">
                      {last ? new Date(last.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      {last
                        ? <Badge variant={{ satisfactory: 'success', concerns: 'warning', unsatisfactory: 'danger' }[last.outcome] as 'success' | 'warning' | 'danger'}>
                            {last.outcome.replace('_', ' ')}
                          </Badge>
                        : <span style={{ color: 'var(--col-muted)', fontSize: 12 }}>Not audited</span>}
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
