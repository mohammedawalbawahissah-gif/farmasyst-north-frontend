import { useState, useRef } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { inputDealerService } from '../../lib/services/inputDealer';
import { toArray } from '../../lib/api';
import { Plus, Pencil, Trash2, ImagePlus } from 'lucide-react';
import type { FarmInput } from '../../types';
import '../farmer/farmer.css';
import { getApiErrorMessage } from '../../lib/errors';

const INPUT_TYPES = [
  { value:'feed',         label:'🌾 Feed' },
  { value:'vaccine',      label:'💉 Vaccine' },
  { value:'medication',   label:'💊 Medication' },
  { value:'equipment',    label:'🔧 Equipment' },
  { value:'supplement',   label:'🧪 Supplement' },
  { value:'disinfectant', label:'🧴 Disinfectant' },
  { value:'other',        label:'📦 Other' },
];

const REGIONS = ['Greater Accra','Ashanti','Northern','Upper East','Upper West','Brong-Ahafo','Volta','Eastern','Central','Western'];

export default function InputDealerListings() {
  const listings = useAsync(() => inputDealerService.listMyListings(), []);
  const all = toArray<FarmInput>(listings.data);

  const photoRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<string|null>(null);
  const [photo, setPhoto]         = useState<File|null>(null);
  const [form, setForm]           = useState({ name:'', input_type:'feed', brand:'', description:'', unit:'kg', price:'', quantity_available:'', min_order_quantity:'1', region:'', is_available:true });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const resetForm = () => { setForm({ name:'', input_type:'feed', brand:'', description:'', unit:'kg', price:'', quantity_available:'', min_order_quantity:'1', region:'', is_available:true }); setPhoto(null); setEditing(null); setShowForm(false); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { setError('Name and price are required.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (photo) fd.append('photo', photo);
      if (editing) { await inputDealerService.updateListing(editing, fd); }
      else          { await inputDealerService.createListing(fd); }
      resetForm(); listings.refetch();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Failed to save listing.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (l: typeof all[0]) => {
    setForm({ name:l.name, input_type:l.input_type, brand:l.brand, description:l.description, unit:l.unit, price:l.price, quantity_available:String(l.quantity_available), min_order_quantity:String(l.min_order_quantity), region:l.region, is_available:l.is_available });
    setEditing(l.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    await inputDealerService.deleteListing(id); listings.refetch();
  };

  const inp = (field: Exclude<keyof typeof form, 'is_available'>) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value })),
  });

  return (
    <div>
      <PageHeader title="My Listings" subtitle="Farm inputs available to farmers and consumers."
        action={<Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14}/> Add Listing</Button>} />

      {showForm && (
        <Card style={{ marginBottom:'var(--sp-md)', border:'1px solid var(--col-primary)' }}>
          <SectionTitle>{editing ? 'Edit Listing' : 'New Listing'}</SectionTitle>
          {error && <p style={{ color:'var(--col-danger)', fontSize:13 }}>{error}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-sm)' }}>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Product Name *</label>
              <input className="form-input" placeholder="e.g. Broiler Starter Feed 50kg" {...inp('name')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Type *</label>
              <select className="form-input" value={form.input_type} onChange={e=>setForm(f=>({...f,input_type:e.target.value}))}>
                {INPUT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Brand</label>
              <input className="form-input" placeholder="e.g. GAFCO" {...inp('brand')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Unit *</label>
              <input className="form-input" placeholder="kg / bag / bottle / piece" {...inp('unit')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Price (GHS) *</label>
              <input className="form-input" type="number" placeholder="0.00" {...inp('price')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Qty Available</label>
              <input className="form-input" type="number" placeholder="100" {...inp('quantity_available')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Min Order Qty</label>
              <input className="form-input" type="number" {...inp('min_order_quantity')} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Region</label>
              <select className="form-input" value={form.region} onChange={e=>setForm(f=>({...f,region:e.target.value}))}>
                <option value="">All regions</option>
                {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:12, color:'var(--col-muted)' }}>Description</label>
              <textarea className="form-input" rows={2} style={{ resize:'vertical' }} placeholder="Product details, benefits, usage instructions…" {...inp('description')} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)' }}>
              <input type="checkbox" id="is_avail" checked={form.is_available} onChange={e=>setForm(f=>({...f,is_available:e.target.checked}))} />
              <label htmlFor="is_avail" style={{ fontSize:13 }}>Currently Available</label>
            </div>
            <div>
              <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>setPhoto(e.target.files?.[0]||null)} />
              <Button size="sm" variant="secondary" onClick={()=>photoRef.current?.click()}><ImagePlus size={14}/> {photo ? photo.name : 'Add Photo'}</Button>
            </div>
          </div>
          <div style={{ display:'flex', gap:'var(--sp-sm)', marginTop:'var(--sp-sm)' }}>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Listing'}</Button>
            <Button variant="secondary" onClick={resetForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {listings.loading ? <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      : all.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>No listings yet.</Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--sp-md)' }}>
          {all.map(l => (
            <Card key={l.id}>
              <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 6, overflow: 'hidden', marginBottom: 8, background: 'var(--col-border)' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  {INPUT_TYPES.find(t => t.value === l.input_type)?.label.split(' ')[0] ?? '📦'}
                </div>
                {l.photo && (
                  <img src={l.photo} alt={l.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                )}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <strong style={{ fontSize:14 }}>{l.name}</strong>
                  <div style={{ display:'flex', gap:'var(--sp-sm)', marginTop:4, flexWrap:'wrap' }}>
                    <Badge variant="neutral">{INPUT_TYPES.find(t=>t.value===l.input_type)?.label ?? l.input_type}</Badge>
                    <Badge variant={l.is_available ? 'success' : 'danger'}>{l.is_available ? 'Available' : 'Out of Stock'}</Badge>
                  </div>
                  {l.brand && <p style={{ fontSize:12, color:'var(--col-muted)', margin:'4px 0 2px' }}>{l.brand}</p>}
                  <p style={{ fontSize:13, fontWeight:600, margin:'4px 0 2px' }}>GHS {l.price} / {l.unit}</p>
                  <p style={{ fontSize:12, color:'var(--col-muted)' }}>Qty: {l.quantity_available} · Min: {l.min_order_quantity}</p>
                  {l.region && <p style={{ fontSize:12, color:'var(--col-muted)' }}>📍 {l.region}</p>}
                </div>
                <div style={{ display:'flex', gap:4, marginLeft:'var(--sp-sm)' }}>
                  <Button size="sm" variant="secondary" onClick={()=>handleEdit(l)}><Pencil size={13}/></Button>
                  <Button size="sm" variant="danger" onClick={()=>handleDelete(l.id)}><Trash2 size={13}/></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
