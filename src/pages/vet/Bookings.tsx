import { useState } from 'react';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { vetService } from '../../lib/services/vet';
import { toArray } from '../../lib/api';
import type { VetBooking } from '../../types';
import { CheckCircle, XCircle } from 'lucide-react';
import '../farmer/farmer.css';

const STATUS_BADGE: Record<string, 'warning'|'info'|'success'|'danger'> = {
  pending: 'warning', confirmed: 'info', completed: 'success', cancelled: 'danger',
};
const VISIT_LABEL: Record<string, string> = {
  on_farm: '🚜 On-Farm', clinic: '🏥 Clinic', telemedicine: '📱 Telemedicine',
};

export default function VetBookings() {
  const bookings = useAsync(() => vetService.listMyBookings(), []);
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'completed'>('all');
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState<string|null>(null);
  const [error, setError] = useState('');

  const all = toArray<VetBooking>(bookings.data);
  const shown = filter === 'all' ? all : all.filter((b: VetBooking) => b.status === filter);

  const handleConfirm = async (id: string) => {
    try { await vetService.confirmBooking(id); bookings.refetch(); }
    catch { setError('Failed to confirm booking.'); }
  };

  const handleComplete = async (id: string) => {
    try {
      await vetService.completeBooking(id, notes);
      setCompleting(null); setNotes('');
      bookings.refetch();
    } catch { setError('Failed to complete booking.'); }
  };

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Manage farmer appointment requests." />

      <div style={{ display:'flex', gap:'var(--sp-sm)', marginBottom:'var(--sp-md)', flexWrap:'wrap' }}>
        {(['all','pending','confirmed','completed'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span style={{ marginLeft:4, background:'rgba(255,255,255,.25)', borderRadius:'9999px', padding:'1px 6px', fontSize:11 }}>
              {all.filter((b: VetBooking) => b.status === f).length}
            </span>}
          </Button>
        ))}
      </div>

      {error && <p style={{ color:'var(--col-danger)', marginBottom:'var(--sp-sm)' }}>{error}</p>}

      {bookings.loading ? (
        <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      ) : shown.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>No bookings in this category.</Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
          {shown.map((b: VetBooking) => (
            <Card key={b.id}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'var(--sp-md)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', marginBottom:4 }}>
                    <strong style={{ fontSize:14 }}>{b.farmer_name}</strong>
                    <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
                  </div>
                  <p style={{ fontSize:13, color:'var(--col-muted)', margin:'2px 0' }}>
                    {b.service_name} · {VISIT_LABEL[b.visit_type]}
                    {b.farm_name && ` · ${b.farm_name}`}
                  </p>
                  <p style={{ fontSize:13, margin:'4px 0' }}>{b.issue_description}</p>
                  <span style={{ fontSize:12, color:'var(--col-muted)' }}>
                    📅 {new Date(b.booking_date).toLocaleString('en-GH', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    {' · '}💵 GHS {b.fee}
                  </span>
                  {completing === b.id && (
                    <div style={{ marginTop:'var(--sp-sm)' }}>
                      <textarea
                        placeholder="Visit notes / diagnosis / prescription…"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        style={{ width:'100%', fontSize:13, padding:8, borderRadius:6, border:'1px solid var(--col-border)', resize:'vertical' }}
                      />
                      <div style={{ display:'flex', gap:'var(--sp-sm)', marginTop:4 }}>
                        <Button size="sm" onClick={() => handleComplete(b.id)}>Save & Complete</Button>
                        <Button size="sm" variant="secondary" onClick={() => setCompleting(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
                  {b.status === 'pending' && (
                    <Button size="sm" onClick={() => handleConfirm(b.id)}>
                      <CheckCircle size={14}/> Confirm
                    </Button>
                  )}
                  {b.status === 'confirmed' && completing !== b.id && (
                    <Button size="sm" variant="secondary" onClick={() => setCompleting(b.id)}>
                      <CheckCircle size={14}/> Complete
                    </Button>
                  )}
                  {b.status === 'pending' && (
                    <Button size="sm" variant="danger" onClick={async () => { await vetService.cancelBooking(b.id); bookings.refetch(); }}>
                      <XCircle size={14}/> Decline
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
