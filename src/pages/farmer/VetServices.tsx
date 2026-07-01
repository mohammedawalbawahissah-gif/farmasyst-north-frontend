import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { vetService } from '../../lib/services/vet';
import { farmsService } from '../../lib/services/farms';
import type { Farm } from '../../types';
import { toArray } from '../../lib/api';
import { Stethoscope, Calendar, MapPin } from 'lucide-react';
import type { VetService, VetBooking } from '../../types';
import './farmer.css';
import { getApiErrorMessage } from '../../lib/errors';

const SERVICE_TYPE_LABEL: Record<string, string> = {
  vaccination: '💉 Vaccination', diagnosis: '🔬 Diagnosis', treatment: '💊 Treatment',
  consultation: '🩺 Consultation', farm_visit: '🚜 Farm Visit', other: '📋 Other',
};

export default function FarmerVetServices() {
  // vets listed via services endpoint only
  const services = useAsync(() => vetService.listServices(), []);
  const farms    = useAsync(() => farmsService.list(), []);
  const bookings = useAsync(() => vetService.listBookings(), []);

  const [activeTab, setActiveTab] = useState<'services'|'bookings'>('services');
  const [showBook, setShowBook]   = useState(false);
  const [selService, setSelService] = useState<VetService|null>(null);
  const [farmId, setFarmId]     = useState('');
  const [date, setDate]         = useState('');
  const [visitType, setVisitType] = useState<'on_farm'|'clinic'|'telemedicine'>('on_farm');
  const [issue, setIssue]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const allServices = toArray<VetService>(services.data);
  const allBookings = toArray<VetBooking>(bookings.data);
  const allFarms    = toArray<Farm>(farms.data);

  const openBooking = (s: VetService) => { setSelService(s); setShowBook(true); setError(''); setSuccess(''); };
  const resetBook   = () => { setShowBook(false); setSelService(null); setFarmId(''); setDate(''); setIssue(''); };

  const handleBook = async () => {
    if (!selService || !date || !issue.trim()) { setError('Please fill all required fields.'); return; }
    setSaving(true); setError('');
    try {
      await vetService.createBooking({
        vet: selService.vet,
        service: selService.id,
        farm: farmId || undefined,
        booking_date: date,
        visit_type: visitType,
        issue_description: issue,
      });
      setSuccess('Booking request sent! The vet will confirm shortly.');
      resetBook(); bookings.refetch();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Booking failed. Please try again.'));
    } finally { setSaving(false); }
  };

  const STATUS_BADGE: Record<string, 'warning'|'info'|'success'|'danger'> = {
    pending:'warning', confirmed:'info', completed:'success', cancelled:'danger',
  };

  return (
    <div>
      <PageHeader title="Veterinary Services" subtitle="Access qualified vets for your poultry farm." />

      {success && <div style={{ background:'var(--col-success-bg)', color:'var(--col-success)', padding:'var(--sp-sm) var(--sp-md)', borderRadius:8, marginBottom:'var(--sp-md)', fontSize:13 }}>{success}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'var(--sp-sm)', marginBottom:'var(--sp-md)' }}>
        {(['services','bookings'] as const).map(t => (
          <Button key={t} size="sm" variant={activeTab===t?'primary':'secondary'} onClick={() => setActiveTab(t)}>
            {t === 'services' ? '🩺 Browse Services' : `📅 My Bookings (${allBookings.length})`}
          </Button>
        ))}
      </div>

      {/* Booking modal */}
      {showBook && selService && (
        <Card style={{ marginBottom:'var(--sp-md)', border:'1px solid var(--col-primary)' }}>
          <SectionTitle>Book: {selService.service_name}</SectionTitle>
          <p style={{ fontSize:13, color:'var(--col-muted)', marginBottom:'var(--sp-sm)' }}>
            {selService.vet_clinic} · GHS {selService.price} · {selService.duration_minutes} min
          </p>
          {error && <p style={{ color:'var(--col-danger)', fontSize:13 }}>{error}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-sm)' }}>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Preferred Date & Time *</label>
              <input className="form-input" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Visit Type *</label>
              <select className="form-input" value={visitType} onChange={e=>setVisitType(e.target.value as typeof visitType)}>
                {selService.is_mobile && <option value="on_farm">🚜 On-Farm Visit</option>}
                <option value="clinic">🏥 Clinic Visit</option>
                <option value="telemedicine">📱 Telemedicine</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Which Farm?</label>
              <select className="form-input" value={farmId} onChange={e=>setFarmId(e.target.value)}>
                <option value="">Select farm (optional)</option>
                {allFarms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Describe the Issue *</label>
              <textarea className="form-input" rows={3} style={{ resize:'vertical' }} placeholder="Describe symptoms, affected birds, urgency…" value={issue} onChange={e=>setIssue(e.target.value)} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'var(--sp-sm)', marginTop:'var(--sp-sm)' }}>
            <Button onClick={handleBook} disabled={saving}>{saving ? 'Booking…' : 'Request Booking'}</Button>
            <Button variant="secondary" onClick={resetBook}>Cancel</Button>
          </div>
        </Card>
      )}

      {activeTab === 'services' && (
        services.loading ? <p style={{ color:'var(--col-muted)' }}>Loading services…</p>
        : allServices.length === 0 ? (
          <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>
            <Stethoscope size={32} style={{ opacity:.3, marginBottom:'1rem' }} />
            <p>No vet services available in your region yet.</p>
          </Card>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--sp-md)' }}>
            {allServices.map(s => (
              <Card key={s.id} style={{ display:'flex', flexDirection:'column' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <strong style={{ fontSize:14 }}>{s.service_name}</strong>
                    <Badge variant="neutral">{SERVICE_TYPE_LABEL[s.service_type]}</Badge>
                  </div>
                  <p style={{ fontSize:13, color:'var(--col-muted)', margin:'0 0 6px' }}>{s.vet_clinic}</p>
                  <p style={{ fontSize:13, margin:'0 0 4px' }}>{s.description}</p>
                  <div style={{ display:'flex', gap:'var(--sp-sm)', flexWrap:'wrap', marginTop:6 }}>
                    <span style={{ fontSize:12 }}>💵 GHS {s.price}</span>
                    <span style={{ fontSize:12 }}>⏱ {s.duration_minutes} min</span>
                    {s.region && <span style={{ fontSize:12 }}><MapPin size={11}/> {s.region}</span>}
                    {s.is_mobile && <Badge variant="info">📍 Mobile</Badge>}
                  </div>
                </div>
                <Button style={{ marginTop:'var(--sp-sm)' }} onClick={() => openBooking(s)}>
                  <Calendar size={14}/> Book Now
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {activeTab === 'bookings' && (
        bookings.loading ? <p style={{ color:'var(--col-muted)' }}>Loading…</p>
        : allBookings.length === 0 ? (
          <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>No bookings yet.</Card>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
            {allBookings.map(b => (
              <Card key={b.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', marginBottom:4 }}>
                      <strong style={{ fontSize:14 }}>{b.service_name}</strong>
                      <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
                    </div>
                    <p style={{ fontSize:13, color:'var(--col-muted)', margin:'2px 0' }}>Dr. {b.vet_name} · {b.visit_type.replace('_',' ')}</p>
                    <span style={{ fontSize:12, color:'var(--col-muted)' }}>
                      📅 {new Date(b.booking_date).toLocaleString('en-GH')} · 💵 GHS {b.fee}
                    </span>
                    {b.vet_notes && <p style={{ fontSize:13, background:'var(--col-bg-alt)', padding:'var(--sp-sm)', borderRadius:6, marginTop:6 }}>🩺 {b.vet_notes}</p>}
                  </div>
                  {b.status === 'pending' && (
                    <Button size="sm" variant="danger" onClick={async ()=>{ await vetService.cancelBooking(b.id); bookings.refetch(); }}>Cancel</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
