import { useState, useRef } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { marketplaceService } from '../../lib/services/marketplace';
import { farmsService } from '../../lib/services/farms';
import { ImagePlus } from 'lucide-react';
import './farmer.css';

const PRODUCE_TYPES = [
  { value: 'broilers',    label: '🐔 Broilers' },
  { value: 'layers',      label: '🐓 Layer Birds' },
  { value: 'eggs',        label: '🥚 Eggs' },
  { value: 'day_old',     label: '🐣 Day-Old Chicks' },
  { value: 'smoked',      label: '🍗 Smoked Chicken' },
  { value: 'guinea_fowl', label: '🦃 Guinea Fowl' },
  { value: 'turkey',      label: '🦚 Turkey' },
  { value: 'duck',        label: '🦆 Duck' },
  { value: 'quail',       label: '🐦 Quail' },
  { value: 'other',       label: '📦 Other' },
];

const EGG_SIZES = ['small', 'medium', 'large', 'jumbo'];

export default function FarmerMarketplace() {
  const listings = useAsync(() => marketplaceService.listProduce(), []);
  const orders   = useAsync(() => marketplaceService.listOrders(), []);
  const farms    = useAsync(() => farmsService.list(), []);

  const photoRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [farmId,   setFarmId]   = useState('');
  const [name,     setName]     = useState('');
  const [type,     setType]     = useState('broilers');
  const [qty,      setQty]      = useState('');
  const [unit,     setUnit]     = useState('bird');
  const [price,    setPrice]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [eggSize,  setEggSize]  = useState('');
  const [photo,    setPhoto]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const isEggs = type === 'eggs';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPhotoPreview(null);
    }
  };

  const resetForm = () => {
    setName(''); setType('broilers'); setQty(''); setUnit('bird');
    setPrice(''); setDesc(''); setEggSize(''); setPhoto(null);
    setPhotoPreview(null); setFarmId('');
    if (photoRef.current) photoRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!name || !qty || !price) return;
    if (isEggs && !eggSize) { setError('Please select an egg size.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('produce_type', type);
      fd.append('quantity_available', qty);
      fd.append('unit', unit);
      fd.append('price', price);
      fd.append('description', desc);
      if (farmId) fd.append('farm', farmId);
      if (isEggs && eggSize) fd.append('egg_size', eggSize);
      if (photo) fd.append('photo', photo);

      await marketplaceService.createProduce(fd as any);
      setShowForm(false);
      resetForm();
      listings.refetch();
    } catch {
      setError('Could not create listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const myListings = toArray(listings.data);
  const myOrders   = toArray(orders.data);

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle="List your produce and manage orders from buyers."
        action={
          <Button size="sm" onClick={() => { setShowForm(s => !s); if (showForm) resetForm(); }}>
            {showForm ? 'Cancel' : '+ New Listing'}
          </Button>
        }
      />

      {showForm && (
        <Card style={{ maxWidth: 600, marginBottom: 'var(--sp-xl)' }}>
          <h3 style={{ marginBottom: 'var(--sp-md)' }}>New Produce Listing</h3>
          {error && <p className="form-error">{error}</p>}

          {/* Photo upload */}
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImagePlus size={14} /> Product Photo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)' }}>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="preview"
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--col-border)' }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: 8, border: '2px dashed var(--col-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--col-muted)',
                }}>
                  <ImagePlus size={24} />
                </div>
              )}
              <div>
                <Button size="sm" variant="secondary" onClick={() => photoRef.current?.click()}>
                  {photo ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {photo && (
                  <button
                    onClick={() => { setPhoto(null); setPhotoPreview(null); if (photoRef.current) photoRef.current.value = ''; }}
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--col-danger)', cursor: 'pointer', fontSize: 12 }}
                  >
                    Remove
                  </button>
                )}
                <div style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 4 }}>JPG, PNG up to 5MB</div>
              </div>
            </div>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Name <span className="required">*</span></label>
              <input placeholder="e.g. Fresh Broilers" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={type} onChange={e => { setType(e.target.value); setEggSize(''); }}>
                {PRODUCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Egg size — shows only when type === eggs */}
          {isEggs && (
            <div className="form-field">
              <label>Egg Size <span className="required">*</span></label>
              <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
                {EGG_SIZES.map(s => (
                  <label
                    key={s}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      padding: '6px 14px', borderRadius: 20,
                      border: `2px solid ${eggSize === s ? 'var(--col-primary)' : 'var(--col-border)'}`,
                      background: eggSize === s ? 'var(--col-primary)' : '#fff',
                      color: eggSize === s ? '#fff' : 'inherit',
                      fontSize: 13, fontWeight: eggSize === s ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="egg_size"
                      value={s}
                      checked={eggSize === s}
                      onChange={() => setEggSize(s)}
                      style={{ display: 'none' }}
                    />
                    🥚 {s.charAt(0).toUpperCase() + s.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label>Quantity <span className="required">*</span></label>
              <input type="number" min="1" placeholder="e.g. 50" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}>
                {['bird', 'kg', 'crate', 'tray', 'dozen', 'bag'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Price (GHS) <span className="required">*</span></label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 45.00" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          {toArray(farms.data).length > 0 && (
            <div className="form-field">
              <label>Farm</label>
              <select value={farmId} onChange={e => setFarmId(e.target.value)}>
                <option value="">— Select farm —</option>
                {toArray(farms.data).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-field">
            <label>Description</label>
            <textarea rows={2} placeholder="Describe the produce quality, weight range, availability…" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <Button
            disabled={!name || !qty || !price || saving || (isEggs && !eggSize)}
            onClick={handleCreate}
            style={{ width: '100%' }}
          >
            {saving ? 'Publishing…' : 'Publish Listing'}
          </Button>
        </Card>
      )}

      <SectionTitle>My Listings ({myListings.length})</SectionTitle>
      <Card style={{ marginBottom: 'var(--sp-xl)' }}>
        {listings.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
        ) : myListings.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No listings yet. Add your first produce listing above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Photo</th><th>Name</th><th>Type</th><th>Qty</th><th>Price</th><th>Status</th><th>Rating</th></tr>
            </thead>
            <tbody>
              {myListings.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--col-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        🐔
                      </div>
                    )}
                  </td>
                  <td><strong>{p.name}</strong>{(p as any).egg_size && <span style={{ fontSize: 11, color: 'var(--col-muted)', display: 'block' }}>{(p as any).egg_size} eggs</span>}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.produce_type.replace('_', ' ')}</td>
                  <td>{(p as any).quantity_available ?? p.quantity} {p.unit}</td>
                  <td>GHS {parseFloat(p.price).toLocaleString()}</td>
                  <td><Badge variant={p.status === 'active' ? 'success' : p.status === 'sold_out' ? 'warning' : 'neutral'}>{p.status.replace('_', ' ')}</Badge></td>
                  <td>{parseFloat(p.avg_rating) > 0 ? `★ ${parseFloat(p.avg_rating).toFixed(1)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <SectionTitle>Incoming Orders ({myOrders.length})</SectionTitle>
      <Card>
        {orders.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
        ) : myOrders.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No orders received yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Order ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {myOrders.map(o => (
                <tr key={o.id}>
                  <td className="data-table__mono">{o.id.slice(0, 8)}…</td>
                  <td><strong>GHS {parseFloat(o.total_amount).toLocaleString()}</strong></td>
                  <td><Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : o.status === 'confirmed' ? 'info' : 'warning'}>{o.status}</Badge></td>
                  <td className="data-table__muted">{new Date(o.created_at).toLocaleDateString('en-GH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
