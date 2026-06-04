import { useState } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { marketplaceService } from '../../lib/services/marketplace';
import { Search, X, MapPin, Truck, Store } from 'lucide-react';
import './consumer.css';

const PRODUCE_TYPES = [
  { value: '',            label: 'All types' },
  { value: 'broilers',    label: 'Broilers' },
  { value: 'layers',      label: 'Layer Birds' },
  { value: 'eggs',        label: 'Eggs' },
  { value: 'day_old',     label: 'Day-Old Chicks' },
  { value: 'smoked',      label: 'Smoked Chicken' },
  { value: 'guinea_fowl', label: 'Guinea Fowl' },
  { value: 'turkey',      label: 'Turkey' },
  { value: 'duck',        label: 'Duck' },
  { value: 'quail',       label: 'Quail' },
  { value: 'other',       label: 'Other' },
];

type DeliveryType = 'pickup' | 'delivery';

interface OrderModal {
  produce: any;
  qty: string;
  deliveryType: DeliveryType;
  address: string;
  notes: string;
}

export default function ConsumerMarketplace() {
  const listings = useAsync(() => marketplaceService.listProduce(), []);

  const [search,     setSearch]  = useState('');
  const [typeFilter, setType]    = useState('');
  const [ordering,   setOrder]   = useState('');
  const [msg,        setMsg]     = useState('');
  const [msgType,    setMsgType] = useState<'success'|'error'>('success');

  // Order modal state
  const [modal,    setModal]    = useState<OrderModal | null>(null);
  const [placing,  setPlacing]  = useState(false);
  const [modalErr, setModalErr] = useState('');

  const all = toArray(listings.data).filter(p => {
    const s = search.toLowerCase();
    const matchS = !s || p.name.toLowerCase().includes(s) || (p.farm_name ?? '').toLowerCase().includes(s) || (p.farm_region ?? '').toLowerCase().includes(s);
    const matchT = !typeFilter || p.produce_type === typeFilter;
    return matchS && matchT;
  }).sort((a, b) => {
    if (ordering === 'price')       return parseFloat(a.price) - parseFloat(b.price);
    if (ordering === '-price')      return parseFloat(b.price) - parseFloat(a.price);
    if (ordering === '-avg_rating') return parseFloat(b.avg_rating) - parseFloat(a.avg_rating);
    return 0;
  });

  const openModal = (produce: any) => {
    setModal({ produce, qty: '1', deliveryType: 'pickup', address: '', notes: '' });
    setModalErr('');
  };

  const handlePlaceOrder = async () => {
    if (!modal) return;
    if (modal.deliveryType === 'delivery' && !modal.address.trim()) {
      setModalErr('Please enter a delivery address.'); return;
    }
    if (!modal.qty || parseInt(modal.qty) < 1) {
      setModalErr('Please enter a valid quantity.'); return;
    }
    setPlacing(true); setModalErr('');
    try {
      const total = (parseFloat(modal.produce.price) * parseInt(modal.qty)).toFixed(2);
      await marketplaceService.createOrder({
        delivery_type: modal.deliveryType,
        delivery_address: modal.deliveryType === 'delivery' ? modal.address : '',
        notes: modal.notes,
        total_amount: total,
        items: [{ produce: modal.produce.id, quantity: modal.qty, unit_price: modal.produce.price }],
      } as never);
      setModal(null);
      setMsg(`Order placed successfully! The farmer will confirm shortly.`);
      setMsgType('success');
      listings.refetch();
    } catch {
      setModalErr('Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const totalCost = modal ? (parseFloat(modal.produce.price) * (parseInt(modal.qty) || 0)) : 0;

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Buy quality poultry produce directly from verified farms." />

      {msg && (
        <p className={msgType === 'success' ? 'form-success' : 'form-error'} style={{ marginBottom: 'var(--sp-md)' }}>
          {msg}
        </p>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
          <input style={{ paddingLeft: 32, width: '100%' }} placeholder="Search produce, farm, or region…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setType(e.target.value)} style={{ minWidth: 140 }}>
          {PRODUCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={ordering} onChange={e => setOrder(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">Sort by</option>
          <option value="price">Price (low–high)</option>
          <option value="-price">Price (high–low)</option>
          <option value="-avg_rating">Top rated</option>
        </select>
      </div>

      {/* ── Listings grid ─────────────────────────────────────────────────── */}
      {listings.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading produce…</p>
      ) : all.length === 0 ? (
        <Card><p style={{ padding: 'var(--sp-lg)', color: 'var(--col-muted)', textAlign: 'center' }}>No produce available matching your search.</p></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 'var(--sp-md)' }}>
          {all.map(p => (
            <Card key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)', padding: 0, overflow: 'hidden' }}>

              {/* Product photo */}
              {(p as any).photo ? (
                <img
                  src={(p as any).photo}
                  alt={p.name}
                  style={{ width: '100%', height: 160, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                  {p.produce_type === 'eggs' ? '🥚' : p.produce_type === 'turkey' ? '🦚' : p.produce_type === 'guinea_fowl' ? '🦃' : p.produce_type === 'duck' ? '🦆' : '🐔'}
                </div>
              )}

              <div style={{ padding: '0 var(--sp-md) var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-xs)', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Badge variant={p.produce_type === 'broilers' ? 'success' : p.produce_type === 'eggs' ? 'info' : 'neutral'}>
                    {p.produce_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                  {parseFloat(p.avg_rating) > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>★ {parseFloat(p.avg_rating).toFixed(1)}</span>
                  )}
                </div>

                <strong style={{ fontSize: 15 }}>{p.name}</strong>

                {(p as any).egg_size && (
                  <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                    🥚 {(p as any).egg_size.charAt(0).toUpperCase() + (p as any).egg_size.slice(1)} eggs
                  </span>
                )}

                <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>
                  {p.farm_name && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{p.farm_name}</div>}
                  {p.farm_region && <div style={{ marginLeft: 15, fontSize: 12 }}>{p.farm_region}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-xs)' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--col-primary)' }}>GHS {parseFloat(p.price).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>per {p.unit}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)', textAlign: 'right' }}>
                    {(p as any).quantity_available ?? p.quantity} {p.unit} avail.
                  </div>
                </div>

                {p.is_organic && <Badge variant="success">🌿 Organic</Badge>}

                <Button
                  disabled={p.status !== 'active'}
                  onClick={() => openModal(p)}
                  style={{ marginTop: 'auto' }}
                >
                  {p.status === 'active' ? 'Order Now' : 'Sold Out'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Order Modal ───────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--sp-md)' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--sp-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-md)' }}>
              <div>
                <h3 style={{ margin: 0 }}>Place Order</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--col-muted)' }}>{modal.produce.name} · {modal.produce.farm_name}</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {modalErr && <p className="form-error" style={{ marginBottom: 'var(--sp-md)' }}>{modalErr}</p>}

            {/* Quantity */}
            <div className="form-field">
              <label>Quantity ({modal.produce.unit})</label>
              <input
                type="number" min="1"
                value={modal.qty}
                onChange={e => setModal(m => m ? { ...m, qty: e.target.value } : m)}
              />
              <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                Available: {(modal.produce as any).quantity_available ?? modal.produce.quantity} {modal.produce.unit} · GHS {parseFloat(modal.produce.price).toLocaleString()} per {modal.produce.unit}
              </span>
            </div>

            {/* Delivery option */}
            <div className="form-field">
              <label>Fulfilment method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', marginTop: 4 }}>
                {([
                  { value: 'pickup',   icon: <Store size={18} />,  title: 'Farm Pickup',     sub: 'Collect directly from the farm' },
                  { value: 'delivery', icon: <Truck size={18} />, title: 'Home Delivery',    sub: 'Delivered to your address' },
                ] as const).map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setModal(m => m ? { ...m, deliveryType: opt.value } : m)}
                    style={{
                      border: `2px solid ${modal.deliveryType === opt.value ? 'var(--col-primary)' : 'var(--col-border)'}`,
                      borderRadius: 8, padding: 'var(--sp-sm)', cursor: 'pointer',
                      background: modal.deliveryType === opt.value ? '#f0f7f0' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ color: modal.deliveryType === opt.value ? 'var(--col-primary)' : 'var(--col-muted)', marginBottom: 4 }}>{opt.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 2 }}>{opt.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address — only shown when delivery selected */}
            {modal.deliveryType === 'delivery' && (
              <div className="form-field">
                <label>Delivery address <span className="required">*</span></label>
                <textarea
                  rows={2}
                  placeholder="e.g. House 14, Lamashegu, Tamale"
                  value={modal.address}
                  onChange={e => setModal(m => m ? { ...m, address: e.target.value } : m)}
                />
              </div>
            )}

            {modal.deliveryType === 'pickup' && modal.produce.farm_name && (
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--col-muted)' }}>
                <MapPin size={13} /> Pickup from: <strong style={{ color: 'inherit' }}>{modal.produce.farm_name}</strong>
                {modal.produce.farm_region && ` · ${modal.produce.farm_region}`}
              </div>
            )}

            {/* Notes */}
            <div className="form-field">
              <label>Additional notes (optional)</label>
              <input
                type="text"
                placeholder="e.g. preferred delivery time, special instructions…"
                value={modal.notes}
                onChange={e => setModal(m => m ? { ...m, notes: e.target.value } : m)}
              />
            </div>

            {/* Order summary */}
            <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)', marginBottom: 'var(--sp-md)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Order Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{modal.produce.name} × {modal.qty || 0} {modal.produce.unit}</span>
                <span>GHS {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--col-muted)' }}>
                <span>Fulfilment</span>
                <span>{modal.deliveryType === 'delivery' ? 'Home Delivery' : 'Farm Pickup'}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--col-border)', marginTop: 'var(--sp-sm)', paddingTop: 'var(--sp-sm)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--col-primary)' }}>GHS {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button
                disabled={placing || !modal.qty || parseInt(modal.qty) < 1 || (modal.deliveryType === 'delivery' && !modal.address.trim())}
                onClick={handlePlaceOrder}
                style={{ flex: 1 }}
              >
                {placing ? 'Placing order…' : `Confirm Order · GHS ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
