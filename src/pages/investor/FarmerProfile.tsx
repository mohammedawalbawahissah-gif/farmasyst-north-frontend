import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import { ArrowLeft } from 'lucide-react';
import { displayName, userId } from '../../types';
import './investor.css';

export default function FarmerProfilePage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const profile = useAsync(() => adminService.getFarmerProfile(id!), [id]);
  const farms   = useAsync(() => farmsService.list(), []);

  if (profile.loading) return <p style={{ padding: 'var(--sp-xl)', color: 'var(--col-muted)' }}>Loading…</p>;
  if (profile.error || !profile.data)
    return (
      <div style={{ padding: 'var(--sp-xl)' }}>
        <p style={{ color: 'var(--col-danger)' }}>Could not load farmer profile.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );

  const p    = profile.data as any;
  const name = displayName(p.user) || `Farmer ${p.id}`;
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  // Find this farmer's farms
  const farmerFarms = toArray(farms.data).filter(f => userId(f.owner as any) === userId(p.user));

  return (
    <div>
      <div style={{ marginBottom: 'var(--sp-md)' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </Button>
      </div>

      <PageHeader title="Farmer Profile" subtitle="Detailed profile and creditworthiness information." />

      {/* ── Identity card ── */}
      <Card style={{ marginBottom: 'var(--sp-lg)', display: 'flex', alignItems: 'center', gap: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--col-primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 22, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{name}</h2>
          <div style={{ color: 'var(--col-muted)', fontSize: 14, marginTop: 2 }}>
            {p.district}{p.region ? `, ${p.region}` : ''}
          </div>
          <div style={{ marginTop: 6 }}>
            <Badge variant={p.verification_status === 'verified' ? 'success' : 'warning'}>
              {p.verification_status ?? 'pending'}
            </Badge>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-lg)', marginBottom: 'var(--sp-lg)' }}>
        {/* ── Profile details ── */}
        <Card>
          <SectionTitle>Profile Details</SectionTitle>
          <table className="data-table">
            <tbody>
              <tr><td style={{ color: 'var(--col-muted)' }}>Years farming</td><td><strong>{p.years_of_farming ?? '—'}</strong></td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>Credit score</td><td><strong>{p.credit_score ?? '—'}</strong></td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>Community</td><td>{p.community || '—'}</td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>Region</td><td>{p.region || '—'}</td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>District</td><td>{p.district || '—'}</td></tr>
            </tbody>
          </table>
        </Card>

        {/* ── Credit info ── */}
        <Card>
          <SectionTitle>Credit Information</SectionTitle>
          <table className="data-table">
            <tbody>
              <tr><td style={{ color: 'var(--col-muted)' }}>Loan history</td><td>{p.loan_history_summary || '—'}</td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>Total borrowed</td><td>{p.total_borrowed ? `GHS ${parseFloat(p.total_borrowed).toLocaleString()}` : '—'}</td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>Repayment rate</td><td>{p.repayment_rate ? `${p.repayment_rate}%` : '—'}</td></tr>
              <tr><td style={{ color: 'var(--col-muted)' }}>Defaults</td><td style={{ color: p.default_count > 0 ? 'var(--col-danger)' : undefined }}>{p.default_count ?? 0}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Farms ── */}
      <SectionTitle>Registered Farms</SectionTitle>
      <Card>
        {farms.loading
          ? <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading farms…</p>
          : farmerFarms.length === 0
          ? <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No farms registered yet.</p>
          : (
            <table className="data-table">
              <thead>
                <tr><th>Farm Name</th><th>Location</th><th>Farm Type</th><th>Flock Size</th><th>Status</th></tr>
              </thead>
              <tbody>
                {farmerFarms.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.name}</strong></td>
                    <td>{f.district}, {f.region}</td>
                    <td>{f.flock_type.replace(/_/g, ' ')}</td>
                    <td>{f.flock_size.toLocaleString()}</td>
                    <td><Badge variant={f.is_active ? 'success' : 'neutral'}>{f.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Card>
    </div>
  );
}
