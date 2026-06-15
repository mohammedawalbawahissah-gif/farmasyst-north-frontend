import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { vetService } from '../../lib/services/vet';
import { toArray } from '../../lib/api';
import type { VetService } from '../../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import '../farmer/farmer.css';

const SERVICE_TYPES = [
  { value:'vaccination',   label:'💉 Vaccination' },
  { value:'diagnosis',     label:'🔬 Diagnosis' },
  { value:'treatment',     label:'💊 Treatment' },
  { value:'consultation',  label:'🩺 Consultation' },
  { value:'farm_visit',    label:'🚜 Farm Visit' },
  { value:'other',         label:'📋 Other' },
];

interface ServiceForm {
  service_name: string;
  service_type: VetService['service_type'];
  description: string;
  price: string;
  duration_minutes: string;
  is_mobile: boolean;
  region: string;
}

const DEFAULT_FORM: ServiceForm = {
  service_name: '',
  service_type: 'consultation',
  description: '',
  price: '',
  duration_minutes: '30',
  is_mobile: false,
  region: '',
};

export default function VetServices() {
  const services = useAsync(() => vetService.listMyServices(), []);
  const all = toArray<VetService>(services.data);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => { setForm(DEFAULT_FORM); setEditing(null); setShowForm(false); setError(''); };

  const handleSave = async () => {
    if (!form.service_name.trim() || !form.price) { setError('Service name and price are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, price: form.price, duration_minutes: Number(form.duration_minutes) };
      if (editing) { await vetService.updateService(editing, payload); }
      else          { await vetService.createService(payload); }
      resetForm(); services.refetch();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save service.');
    } finally { setSaving(false); }
  };

  const handleEdit = (s: VetService) => {
    setForm({
      service_name: s.service_name,
      service_type: s.service_type,
      description: s.description,
      price: s.price,
      duration_minutes: String(s.duration_minutes),
      is_mobile: s.is_mobile,
      region: s.region,
    });
    setEditing(s.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    await vetService.deleteService(id); services.refetch();
  };

  const inp = (field: keyof Pick<ServiceForm, 'service_name' | 'description' | 'price' | 'duration_minutes' | 'region'>) => ({
    value: form[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value })),
  });

  return (
    <div>
      <PageHeader title="My Services" subtitle="Services you offer to poultry farmers."
        action={<Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14}/> Add Service</Button>} />

      {showForm && (
        <Card style={{ marginBottom:'var(--sp-md)', border:'1px solid var(--col-primary)' }}>
          <SectionTitle>{editing ? 'Edit Service' : 'New Service'}</SectionTitle>
          {error && <p style={{ color:'var(--col-danger)', fontSize:13 }}>{error}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-sm)' }}>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Service Name *</label>
              <input className="form-input" placeholder="e.g. Newcastle Vaccination" {...inp('service_name')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Type *</label>
              <select className="form-input" value={form.service_type}
                onChange={e => setForm(f => ({ ...f, service_type: e.target.value as VetService['service_type'] }))}>
                {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Price (GHS) *</label>
              <input className="form-input" type="number" placeholder="150.00" {...inp('price')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Duration (mins)</label>
              <input className="form-input" type="number" {...inp('duration_minutes')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Region</label>
              <input className="form-input" placeholder="e.g. Northern Region" {...inp('region')} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', paddingTop:20 }}>
              <input type="checkbox" id="is_mobile" checked={form.is_mobile}
                onChange={e => setForm(f => ({ ...f, is_mobile: e.target.checked }))} />
              <label htmlFor="is_mobile" style={{ fontSize:13 }}>Mobile (comes to farm)</label>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Description</label>
              <textarea className="form-input" rows={2} placeholder="Describe the service…"
                style={{ resize:'vertical' }} {...inp('description')} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'var(--sp-sm)', marginTop:'var(--sp-sm)' }}>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Service'}</Button>
            <Button variant="secondary" onClick={resetForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {services.loading ? (
        <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      ) : all.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>No services yet. Add your first service above.</Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--sp-md)' }}>
          {all.map((s: VetService) => (
            <Card key={s.id}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <strong style={{ fontSize:14 }}>{s.service_name}</strong>
                  <div style={{ display:'flex', gap:'var(--sp-sm)', marginTop:4, flexWrap:'wrap' }}>
                    <Badge variant="neutral">{SERVICE_TYPES.find(t => t.value===s.service_type)?.label ?? s.service_type}</Badge>
                    {s.is_mobile && <Badge variant="info">📍 Mobile</Badge>}
                    {!s.is_active && <Badge variant="danger">Inactive</Badge>}
                  </div>
                  <p style={{ fontSize:13, color:'var(--col-muted)', margin:'6px 0 2px' }}>{s.description}</p>
                  <p style={{ fontSize:13, fontWeight:600 }}>GHS {s.price} · {s.duration_minutes} min</p>
                  {s.region && <p style={{ fontSize:12, color:'var(--col-muted)' }}>📍 {s.region}</p>}
                </div>
                <div style={{ display:'flex', gap:4, marginLeft:'var(--sp-sm)' }}>
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(s)}><Pencil size={13}/></Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}><Trash2 size={13}/></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
