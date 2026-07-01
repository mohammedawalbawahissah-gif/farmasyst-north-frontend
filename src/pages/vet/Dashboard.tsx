import { useAsync } from '../../lib/hooks/useAsync';
import { vetService } from '../../lib/services/vet';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, StatCard, SectionTitle } from '../../components/ui';
import { Stethoscope, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../lib/hooks/useAuth';
import type { VetBooking, VetService } from '../../types';
import '../farmer/farmer.css';

export default function VetDashboard() {
  const { user } = useAuth();
  const bookings = useAsync(() => vetService.listMyBookings(), []);
  const services = useAsync(() => vetService.listMyServices(), []);

  const allBookings = toArray<VetBooking>(bookings.data);
  const allServices = toArray<VetService>(services.data);

  const pending   = allBookings.filter((b: VetBooking) => b.status === 'pending').length;
  const confirmed = allBookings.filter((b: VetBooking) => b.status === 'confirmed').length;
  const completed = allBookings.filter((b: VetBooking) => b.status === 'completed').length;
  const recent    = allBookings.slice(0, 5);

  const STATUS_BADGE: Record<string, 'warning'|'info'|'success'|'danger'> = {
    pending: 'warning', confirmed: 'info', completed: 'success', cancelled: 'danger',
  };

  return (
    <div>
      <PageHeader
        title={`Welcome, Dr. ${user?.first_name ?? ''}`}
        subtitle="Manage your bookings, services, and farmer consultations."
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'var(--sp-md)', marginBottom:'var(--sp-lg)' }}>
        <StatCard label="Pending Bookings"  value={pending}            icon={<Clock size={20}/>} accent="var(--col-warning)" />
        <StatCard label="Confirmed Today"   value={confirmed}          icon={<Calendar size={20}/>} accent="var(--col-primary)" />
        <StatCard label="Completed Total"   value={completed}          icon={<CheckCircle size={20}/>} accent="var(--col-success)" />
        <StatCard label="Active Services"   value={allServices.length} icon={<Stethoscope size={20}/>} accent="#7C3AED" />
      </div>

      <SectionTitle>Recent Bookings</SectionTitle>
      {bookings.loading ? (
        <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      ) : recent.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem' }}>
          <Calendar size={32} style={{ opacity:.3, marginBottom:'1rem' }} />
          <p style={{ color:'var(--col-muted)' }}>No bookings yet. Add services to attract farmers.</p>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
          {recent.map((b: VetBooking) => (
            <Card key={b.id}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <strong style={{ fontSize:14 }}>{b.farmer_name}</strong>
                  <p style={{ fontSize:13, color:'var(--col-muted)', margin:'2px 0' }}>{b.service_name} — {b.visit_type.replace('_',' ')}</p>
                  <span style={{ fontSize:12, color:'var(--col-muted)' }}>{new Date(b.booking_date).toLocaleDateString('en-GH', { weekday:'short', day:'numeric', month:'short' })}</span>
                </div>
                <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
