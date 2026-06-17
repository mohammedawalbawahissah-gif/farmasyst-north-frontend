import { useState, useEffect } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { marketplaceService } from '../../lib/services/marketplace';
import { inputDealerService } from '../../lib/services/inputDealer';
import type { Produce, FarmInput } from '../../types';
import { Search, X, MapPin, Truck, Store, Package, Phone } from 'lucide-react';
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

type DeliveryType  = 'pickup' | 'delivery';
type PaymentMethod = 'momo' | 'card' | 'bank_transfer' | 'cash_on_delivery';
type Step          = 'order' | 'payment' | 'done';

interface OrderModal {
  produce:       any;
  qty:           string;
  deliveryType:  DeliveryType;
  paymentMethod: PaymentMethod;
  address:       string;
  pickupDate:    string;
  notes:         string;
}

export default function ConsumerMarketplace() {
  const listings = useAsync(() => marketplaceService.listProduce(), []);

  const [consumerTab, setConsumerTab] = useState<'produce'|'inputs'>('produce');
  const [search,     setSearch]  = useState('');
  const [typeFilter, setType]    = useState('');
  const [ordering,   setOrder]   = useState('');
  const [msg,        setMsg]     = useState('');
  const [msgType,    setMsgType] = useState<'success' | 'error'>('success');

  const [modal,    setModal]    = useState<OrderModal | null>(null);
  const [step,     setStep]     = useState<Step>('order');
  const [placing,  setPlacing]  = useState(false);
  const [modalErr, setModalErr] = useState('');

  // MoMo payment fields
  const [momoPhone,  setMomoPhone]  = useState('');
  const [momoErr,    setMomoErr]    = useState('');
  const [momoSent,   setMomoSent]   = useState(false);

  const all = toArray<Produce>(listings.data).filter(p => {
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
    // Default to the first payment method the seller actually accepts
    const defaultPayment: PaymentMethod =
      produce.accepts_momo          ? 'momo' :
      produce.accepts_card          ? 'card' :
      produce.accepts_bank_transfer ? 'bank_transfer' :
      'cash_on_delivery';
    setModal({ produce, qty: '1', deliveryType: 'pickup', paymentMethod: defaultPayment, address: '', pickupDate: '', notes: '' });
    setStep('order');
    setModalErr('');
    setMomoPhone('');
    setMomoErr('');
    setMomoSent(false);
  };

  const closeModal = () => {
    setModal(null);
    setStep('order');
    setMomoSent(false);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  const totalCost = modal
    ? parseFloat(modal.produce.price) * (parseInt(modal.qty) || 0)
    : 0;

  // Step 1 → validate and advance
  const handleContinue = () => {
    if (!modal) return;
    if (!modal.qty || parseInt(modal.qty) < 1) { setModalErr('Please enter a valid quantity.'); return; }
    if (modal.deliveryType === 'delivery' && !modal.address.trim()) { setModalErr('Please enter a delivery address.'); return; }
    setModalErr('');
    if (modal.paymentMethod !== 'cash_on_delivery') {
      setStep('payment');
    } else {
      placeOrder(null); // cash on delivery — no extra step
    }
  };

  // Final order placement
  const placeOrder = async (phone: string | null) => {
    if (!modal) return;
    setPlacing(true); setModalErr(''); setMomoErr('');
    try {
      await marketplaceService.createOrder({
        delivery_type:    modal.deliveryType,
        delivery_address: modal.deliveryType === 'delivery' ? modal.address : '',
        delivery_date:    modal.pickupDate || undefined,
        payment_method:   modal.paymentMethod,
        notes:            modal.notes,
        items_data: [{ produce: modal.produce.id, quantity: modal.qty, unit_price: modal.produce.price }],
      } as never);
      setStep('done');
      const successMsg =
        modal.paymentMethod === 'momo'          ? `Order placed! A MoMo prompt has been sent to ${phone}.` :
        modal.paymentMethod === 'card'          ? 'Order placed! Redirecting to Paystack for secure payment.' :
        modal.paymentMethod === 'bank_transfer' ? 'Order placed! Please complete your bank transfer to finalise.' :
        'Order placed! Pay on delivery.';
      setMsg(successMsg);
      setMsgType('success');
      listings.refetch();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Could not place order. Please try again.';
      if (step === 'payment') { setMomoErr(detail); }
      else                    { setModalErr(detail); }
    } finally {
      setPlacing(false);
    }
  };

  const handleMomoPay = () => {
    if (!modal) return;
    if (modal.paymentMethod === 'momo') {
      if (!momoPhone.trim() || momoPhone.length < 10) { setMomoErr('Please enter a valid MoMo number.'); return; }
      placeOrder(momoPhone);
      setMomoSent(true);
    } else if (modal.paymentMethod === 'card') {
      placeOrder(null);
    } else if (modal.paymentMethod === 'bank_transfer') {
      placeOrder(momoPhone.trim() || null);
    }
  };

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Buy quality poultry produce and farm inputs from verified suppliers." />

      <div style={{ display:'flex', gap:'var(--sp-sm)', marginBottom:'var(--sp-md)' }}>
        <Button size="sm" variant={consumerTab==='produce'?'primary':'secondary'} onClick={()=>setConsumerTab('produce')}>
          🐔 Poultry Produce
        </Button>
        <Button size="sm" variant={consumerTab==='inputs'?'primary':'secondary'} onClick={()=>setConsumerTab('inputs')}>
          🌾 Farm Inputs
        </Button>
      </div>

      {consumerTab === 'inputs' && <ConsumerInputShop />}
      {consumerTab === 'produce' && <>

      {msg && (
        <p className={msgType === 'success' ? 'form-success' : 'form-error'} style={{ marginBottom: 'var(--sp-md)' }}>
          {msg}
        </p>
      )}

      {/* ── Filters ── */}
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

      {/* ── Listings grid ── */}
      {listings.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading produce…</p>
      ) : all.length === 0 ? (
        <Card><p style={{ padding: 'var(--sp-lg)', color: 'var(--col-muted)', textAlign: 'center' }}>No produce available matching your search.</p></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 'var(--sp-md)' }}>
          {all.map(p => (
            <Card key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)', padding: 0, overflow: 'hidden' }}>
              {(p as any).photo ? (
                <img src={(p as any).photo} alt={p.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                  {p.produce_type === 'eggs' ? '🥚' : p.produce_type === 'turkey' ? '🦚' : p.produce_type === 'guinea_fowl' ? '🦃' : p.produce_type === 'duck' ? '🦆' : '🐔'}
                </div>
              )}
              <div style={{ padding: '0 var(--sp-md) var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-xs)', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Badge variant={p.produce_type === 'broilers' ? 'success' : p.produce_type === 'eggs' ? 'info' : 'neutral'}>
                    {p.produce_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Badge>
                  {parseFloat(p.avg_rating) > 0 && <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>★ {parseFloat(p.avg_rating).toFixed(1)}</span>}
                </div>
                <strong style={{ fontSize: 15 }}>{p.name}</strong>
                {(p as any).egg_size && <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>🥚 {(p as any).egg_size.charAt(0).toUpperCase() + (p as any).egg_size.slice(1)} eggs</span>}
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
                <Button disabled={p.status !== 'active'} onClick={() => openModal(p)} style={{ marginTop: 'auto' }}>
                  {p.status === 'active' ? 'Order Now' : 'Sold Out'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Order Modal ── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1000,
          padding: '24px 16px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12,
            width: '100%', maxWidth: 480,
            overflowY: 'visible',
            overflowX: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column',
            margin: 'auto',
            flexShrink: 0,
          }}>

            {/* ── STEP: done ── */}
            {step === 'done' && (
              <div style={{ padding: 'var(--sp-xl)', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <h3 style={{ marginBottom: 8 }}>Order Placed!</h3>
                <p style={{ color: 'var(--col-muted)', fontSize: 14, marginBottom: 'var(--sp-lg)' }}>{msg}</p>
                <Button onClick={closeModal} style={{ width: '100%' }}>Close</Button>
              </div>
            )}

            {/* ── STEP: payment (MoMo) ── */}
            {step === 'payment' && (
              <div style={{ padding: 'var(--sp-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-md)' }}>
                  <h3 style={{ margin: 0 }}>
                    {modal.paymentMethod === 'momo' ? '📱 MTN Mobile Money' : modal.paymentMethod === 'card' ? '💳 Card Payment' : '🏦 Bank Transfer'}
                  </h3>
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)' }}><X size={20} /></button>
                </div>

                <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)', marginBottom: 'var(--sp-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>Total to pay</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--col-primary)' }}>
                    GHS {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)', marginTop: 4 }}>{modal.produce.name} × {modal.qty} {modal.produce.unit}</div>
                </div>

                <div style={{
                  background: '#fff8e1', border: '1px solid #f9a825',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 'var(--sp-md)', fontSize: 13, color: '#7c5800',
                }}>
                  {modal.paymentMethod === 'momo' && '📱 Enter your MTN Mobile Money number. A payment prompt will be sent to your phone.'}
                  {modal.paymentMethod === 'card' && '💳 Click Pay to be redirected to Paystack for secure card payment.'}
                  {modal.paymentMethod === 'bank_transfer' && '🏦 Transfer to: FarmAsyst North · Stanbic Bank · Acc: 9040008877142 · Enter your reference below.'}
                </div>

                {momoErr && <p className="form-error" style={{ marginBottom: 'var(--sp-sm)' }}>{momoErr}</p>}

                {modal.paymentMethod === 'momo' && (
                  <div className="form-field">
                    <label>MoMo phone number</label>
                    <input type="tel" placeholder="024XXXXXXX"
                      value={momoPhone} onChange={e => setMomoPhone(e.target.value)}
                      disabled={momoSent && placing} />
                  </div>
                )}
                {modal.paymentMethod === 'bank_transfer' && (
                  <div className="form-field">
                    <label>Transfer reference (optional)</label>
                    <input type="text" placeholder="e.g. your name or order number"
                      value={momoPhone} onChange={e => setMomoPhone(e.target.value)} />
                  </div>
                )}
                {modal.paymentMethod === 'card' && (
                  <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>
                    Click "Pay" to be redirected to Paystack for secure card payment.
                  </p>
                )}

                <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 'var(--sp-md)' }}>
                  <Button variant="secondary" onClick={() => { setStep('order'); setMomoErr(''); }}>Back</Button>
                  <Button
                    style={{ flex: 1 }}
                    disabled={placing || (modal.paymentMethod === 'momo' && (!momoPhone.trim() || momoPhone.length < 10))}
                    onClick={handleMomoPay}
                  >
                    {placing ? 'Sending prompt…' : `Pay GHS ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP: order details ── */}
            {step === 'order' && (
              <div style={{ padding: 'var(--sp-lg)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-md)' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Place Order</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--col-muted)' }}>{modal.produce.name} · {modal.produce.farm_name}</p>
                  </div>
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 4 }}>
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

                {/* Fulfilment */}
                <div className="form-field">
                  <label>Fulfilment method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)', marginTop: 4 }}>
                    {([
                      { value: 'pickup',   icon: <Store size={18} />, title: 'Farm Pickup',    sub: 'Collect directly from the farm' },
                      { value: 'delivery', icon: <Truck size={18} />, title: 'Home Delivery',  sub: 'Delivered to your address' },
                    ] as const).map(opt => (
                      <div key={opt.value} onClick={() => setModal(m => m ? { ...m, deliveryType: opt.value } : m)}
                        style={{
                          border: `2px solid ${modal.deliveryType === opt.value ? 'var(--col-primary)' : 'var(--col-border)'}`,
                          borderRadius: 8, padding: 'var(--sp-sm)', cursor: 'pointer',
                          background: modal.deliveryType === opt.value ? '#f0f7f0' : '#fff',
                        }}>
                        <div style={{ color: modal.deliveryType === opt.value ? 'var(--col-primary)' : 'var(--col-muted)', marginBottom: 4 }}>{opt.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 2 }}>{opt.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {modal.deliveryType === 'delivery' && (
                  <div className="form-field">
                    <label>Delivery address <span className="required">*</span></label>
                    <textarea rows={2} placeholder="e.g. House 14, Lamashegu, Tamale"
                      value={modal.address}
                      onChange={e => setModal(m => m ? { ...m, address: e.target.value } : m)} />
                  </div>
                )}

                {modal.deliveryType === 'pickup' && modal.produce.farm_name && (
                  <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--col-muted)' }}>
                    <MapPin size={13} /> Pickup from: <strong>{modal.produce.farm_name}</strong>
                    {modal.produce.farm_region && ` · ${modal.produce.farm_region}`}
                  </div>
                )}

                {/* Date */}
                <div className="form-field">
                  <label>Preferred {modal.deliveryType === 'pickup' ? 'pickup' : 'delivery'} date <span style={{ color: 'var(--col-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="date" min={new Date().toISOString().split('T')[0]}
                    value={modal.pickupDate}
                    onChange={e => setModal(m => m ? { ...m, pickupDate: e.target.value } : m)} />
                </div>

                {/* Payment method */}
                <div className="form-field">
                  <label>Payment method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
                    {([
                      { value: 'momo',             icon: '📱', title: 'MTN MoMo',         sub: 'Mobile money prompt',  accepted: modal.produce.accepts_momo ?? true },
                      { value: 'card',             icon: '💳', title: 'Card (Paystack)',   sub: 'Visa / Mastercard',    accepted: modal.produce.accepts_card ?? false },
                      { value: 'bank_transfer',    icon: '🏦', title: 'Bank Transfer',     sub: 'Direct bank payment',  accepted: modal.produce.accepts_bank_transfer ?? false },
                      { value: 'cash_on_delivery', icon: '💵', title: 'Cash on Delivery', sub: 'Pay on receipt',        accepted: modal.produce.accepts_cod ?? true },
                    ] as const).map(opt => (
                      <div key={opt.value}
                        onClick={() => opt.accepted && setModal(m => m ? { ...m, paymentMethod: opt.value } : m)}
                        style={{
                          border: `2px solid ${modal.paymentMethod === opt.value ? 'var(--col-primary)' : opt.accepted ? 'var(--col-border)' : 'transparent'}`,
                          borderRadius: 8, padding: 'var(--sp-sm)',
                          cursor: opt.accepted ? 'pointer' : 'not-allowed',
                          background: modal.paymentMethod === opt.value ? '#fffbf0' : opt.accepted ? '#fff' : '#f5f5f5',
                          textAlign: 'center',
                          opacity: opt.accepted ? 1 : 0.4,
                        }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 2 }}>
                          {opt.accepted ? opt.sub : 'Not accepted'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="form-field">
                  <label>Additional notes (optional)</label>
                  <input type="text" placeholder="e.g. preferred delivery time, special instructions…"
                    value={modal.notes}
                    onChange={e => setModal(m => m ? { ...m, notes: e.target.value } : m)} />
                </div>

                {/* Order summary */}
                <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 'var(--sp-md)', marginBottom: 'var(--sp-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>Order Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{modal.produce.name} × {modal.qty || 0} {modal.produce.unit}</span>
                    <span>GHS {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--col-muted)', marginBottom: 4 }}>
                    <span>Fulfilment</span><span>{modal.deliveryType === 'delivery' ? 'Home Delivery' : 'Farm Pickup'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--col-muted)' }}>
                    <span>Payment</span><span>{{ momo: 'MTN MoMo', card: 'Card (Paystack)', bank_transfer: 'Bank Transfer', cash_on_delivery: 'Cash on Delivery' }[modal.paymentMethod] ?? modal.paymentMethod}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--col-border)', marginTop: 'var(--sp-sm)', paddingTop: 'var(--sp-sm)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--col-primary)' }}>GHS {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
                  <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                  <Button
                    disabled={!modal.qty || parseInt(modal.qty) < 1 || (modal.deliveryType === 'delivery' && !modal.address.trim())}
                    onClick={handleContinue}
                    style={{ flex: 1 }}
                  >
                    {modal.paymentMethod === 'cash_on_delivery'
                      ? `Confirm Order · GHS ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : `Continue to Payment · GHS ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </> }
    </div>
  );
}

// ── Farm Inputs tab for consumers ─────────────────────────────────────────────
function ConsumerInputShop() {
  const inputs = useAsync(() => inputDealerService.listInputs({ is_available: 'true' }), []);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const INPUT_TYPES = [
    { value:'',             label:'All Types' },
    { value:'feed',         label:'🌾 Feed' },
    { value:'vaccine',      label:'💉 Vaccine' },
    { value:'medication',   label:'💊 Medication' },
    { value:'equipment',    label:'🔧 Equipment' },
    { value:'supplement',   label:'🧪 Supplement' },
    { value:'disinfectant', label:'🧴 Disinfectant' },
    { value:'other',        label:'📦 Other' },
  ];
  const INPUT_LABEL: Record<string,string> = {
    feed:'🌾 Feed', vaccine:'💉 Vaccine', medication:'💊 Medication',
    equipment:'🔧 Equipment', supplement:'🧪 Supplement',
    disinfectant:'🧴 Disinfectant', other:'📦 Other',
  };

  const all   = toArray<FarmInput>(inputs.data);
  const shown = all.filter(l =>
    (typeFilter === '' || l.input_type === typeFilter) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.brand?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display:'flex', gap:'var(--sp-sm)', marginBottom:'var(--sp-md)', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--col-muted)' }} />
          <input style={{ paddingLeft:32, width:'100%' }} placeholder="Search products or brands…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ minWidth:160 }}>
          {INPUT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {inputs.loading ? <p style={{color:'var(--col-muted)'}}>Loading…</p>
      : shown.length === 0 ? (
        <div style={{textAlign:'center',padding:'3rem',color:'var(--col-muted)'}}>
          <Package size={32} style={{opacity:.3,marginBottom:'1rem'}}/>
          <p>No farm inputs available yet.</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'var(--sp-md)'}}>
          {shown.map(l => (
            <div key={l.id} className="card" style={{display:'flex',flexDirection:'column'}}>
              {l.photo && <img src={l.photo} alt={l.name} style={{width:'100%',height:130,objectFit:'cover',borderRadius:6,marginBottom:8}}/>}
              <div style={{flex:1}}>
                <strong style={{fontSize:14}}>{l.name}</strong>
                <span style={{marginLeft:6,fontSize:11,padding:'2px 6px',borderRadius:4,background:'var(--col-bg-alt)',color:'var(--col-muted)'}}>{INPUT_LABEL[l.input_type]??l.input_type}</span>
                {l.brand && <p style={{fontSize:12,color:'var(--col-muted)',margin:'4px 0 2px'}}>Brand: {l.brand}</p>}
                <p style={{fontSize:15,fontWeight:700,margin:'4px 0'}}>GHS {l.price} <span style={{fontSize:12,fontWeight:400}}>/ {l.unit}</span></p>
                {l.description && <p style={{fontSize:12,color:'var(--col-muted)',margin:'0 0 4px'}}>{l.description}</p>}
                {l.region && <p style={{fontSize:12,color:'var(--col-muted)'}}><MapPin size={11}/> {l.region}</p>}
                <p style={{fontSize:12,color:'var(--col-muted)'}}>📦 {l.quantity_available} available · Min: {l.min_order_quantity}</p>
              </div>
              <div style={{marginTop:'var(--sp-sm)',borderTop:'1px solid var(--col-border)',paddingTop:'var(--sp-sm)'}}>
                <p style={{fontSize:13,fontWeight:500,margin:'0 0 4px'}}>🏪 {l.business_name}</p>
                <button
                  className="btn btn--secondary btn--sm"
                  style={{width:'100%',display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}
                  onClick={() => (l as any).dealer_phone
                    ? window.open(`tel:${(l as any).dealer_phone}`)
                    : alert(`Contact ${l.business_name} — no phone number listed.`)}
                >
                  <Phone size={13}/> Contact Dealer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}