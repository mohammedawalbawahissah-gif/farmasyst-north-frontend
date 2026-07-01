import { useState, useRef } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { marketplaceService } from '../../lib/services/marketplace';
import { farmsService } from '../../lib/services/farms';
import type { Order, Farm, Produce } from '../../types';
import { ImagePlus, Truck, MapPin, Package, Phone } from 'lucide-react';
import './farmer.css';

const PRODUCE_TYPES = [
  { value:'broilers',    label:'🐔 Broilers' },
  { value:'layers',      label:'🐓 Layer Birds' },
  { value:'eggs',        label:'🥚 Eggs' },
  { value:'day_old',     label:'🐣 Day-Old Chicks' },
  { value:'smoked',      label:'🍗 Smoked Chicken' },
  { value:'guinea_fowl', label:'🦃 Guinea Fowl' },
  { value:'turkey',      label:'🦚 Turkey' },
  { value:'duck',        label:'🦆 Duck' },
  { value:'quail',       label:'🐦 Quail' },
  { value:'other',       label:'📦 Other' },
];

const EGG_SIZES = ['small','medium','large','jumbo'];

const PAYMENT_OPTIONS = [
  { key: 'accepts_momo',          label: '📱 MoMo',         hint: 'MTN Mobile Money (Direct)' },
  { key: 'accepts_hubtel_momo',   label: '📲 Mobile Money (Other Networks)', hint: 'Telecel / AirtelTigo via Hubtel' },
  { key: 'accepts_card',          label: '💳 Card',          hint: 'Hubtel' },
  { key: 'accepts_bank_transfer', label: '🏦 Bank Transfer', hint: 'Direct bank' },
  { key: 'accepts_cod',           label: '💵 Cash on Delivery', hint: 'Pay on pickup/delivery' },
];

const ORDER_STATUS_BADGE: Record<string,'success'|'warning'|'danger'|'info'|'neutral'> = {
  pending:'warning', confirmed:'info', processing:'info',
  shipped:'info', delivered:'success', cancelled:'danger', refunded:'neutral',
};

function DeliveryBadge({ order }: { order: Order }) {
  return order.delivery_type === 'delivery'
    ? <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:'#1A4A6B'}}>
        <Truck size={12}/> Home Delivery
      </span>
    : <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:'#4A7C2F'}}>
        <MapPin size={12}/> Farm Pickup
      </span>;
}

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
  const [photo,    setPhoto]    = useState<File|null>(null);
  const [photoPreview, setPreview] = useState<string|null>(null);
  // Contact & payment
  const [contactPhone, setContactPhone] = useState('');
  const [paymentMethods, setPaymentMethods] = useState({
    accepts_momo: true,
    accepts_hubtel_momo: false,
    accepts_card: false,
    accepts_bank_transfer: false,
    accepts_cod: true,
  });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [confirming, setConfirming] = useState<string|null>(null);

  const isEggs = type === 'eggs';

  const togglePayment = (key: keyof typeof paymentMethods) => {
    setPaymentMethods(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    if (f) {
      const r = new FileReader();
      r.onload = ev => setPreview(ev.target?.result as string);
      r.readAsDataURL(f);
    } else setPreview(null);
  };

  const resetForm = () => {
    setName(''); setType('broilers'); setQty(''); setUnit('bird');
    setPrice(''); setDesc(''); setEggSize(''); setPhoto(null); setPreview(null); setFarmId('');
    setContactPhone('');
    setPaymentMethods({ accepts_momo: true, accepts_hubtel_momo: false, accepts_card: false, accepts_bank_transfer: false, accepts_cod: true });
    if (photoRef.current) photoRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!name || !qty || !price) return;
    if (isEggs && !eggSize) { setError('Please select an egg size.'); return; }
    if (!paymentMethods.accepts_momo && !paymentMethods.accepts_hubtel_momo && !paymentMethods.accepts_card &&
        !paymentMethods.accepts_bank_transfer && !paymentMethods.accepts_cod) {
      setError('Please select at least one accepted payment method.'); return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name); fd.append('produce_type', type);
      fd.append('quantity_available', qty); fd.append('unit', unit);
      fd.append('price', price); fd.append('description', desc);
      if (farmId) fd.append('farm', farmId);
      if (isEggs && eggSize) fd.append('egg_size', eggSize);
      if (photo) fd.append('photo', photo);
      if (contactPhone) fd.append('contact_phone', contactPhone);
      fd.append('accepts_momo',          String(paymentMethods.accepts_momo));
      fd.append('accepts_hubtel_momo',   String(paymentMethods.accepts_hubtel_momo));
      fd.append('accepts_card',          String(paymentMethods.accepts_card));
      fd.append('accepts_bank_transfer', String(paymentMethods.accepts_bank_transfer));
      fd.append('accepts_cod',           String(paymentMethods.accepts_cod));
      await marketplaceService.createProduce(fd as never);
      setShowForm(false); resetForm(); listings.refetch();
    } catch { setError('Could not create listing. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleConfirm = async (orderId: string) => {
    setConfirming(orderId);
    try {
      await marketplaceService.confirmOrder(orderId);
      orders.refetch();
    } catch { /* silently */ }
    finally { setConfirming(null); }
  };

  const myListings = toArray<Produce>(listings.data);
  const myOrders   = toArray<Order>(orders.data);
  const newOrders  = myOrders.filter(o => o.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle="List your produce and manage orders from buyers."
        action={
          <Button size="sm" onClick={()=>{ setShowForm(s=>!s); if (showForm) resetForm(); }}>
            {showForm ? 'Cancel' : '+ New Listing'}
          </Button>
        }
      />

      {/* ── New listing form ─────────────────────────────────────── */}
      {showForm && (
        <Card style={{maxWidth:600,marginBottom:'var(--sp-xl)'}}>
          <h3 style={{marginBottom:'var(--sp-md)'}}>New Produce Listing</h3>
          {error && <p className="form-error">{error}</p>}

          <div className="form-field">
            <label style={{display:'flex',alignItems:'center',gap:6}}><ImagePlus size={14}/> Product Photo</label>
            <div style={{display:'flex',alignItems:'center',gap:'var(--sp-md)'}}>
              {photoPreview
                ? <img src={photoPreview} alt="preview" style={{width:80,height:80,borderRadius:8,objectFit:'cover',border:'1px solid var(--col-border)'}}/>
                : <div style={{width:80,height:80,borderRadius:8,border:'2px dashed var(--col-border)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--col-muted)'}}>
                    <ImagePlus size={24}/>
                  </div>}
              <div>
                <Button size="sm" variant="secondary" onClick={()=>photoRef.current?.click()}>
                  {photo?'Change Photo':'Upload Photo'}
                </Button>
                {photo && <button onClick={()=>{setPhoto(null);setPreview(null);if(photoRef.current)photoRef.current.value='';}}
                  style={{marginLeft:8,background:'none',border:'none',color:'var(--col-danger)',cursor:'pointer',fontSize:12}}>Remove</button>}
                <div style={{fontSize:11,color:'var(--col-muted)',marginTop:4}}>JPG, PNG up to 5MB</div>
              </div>
            </div>
            <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoChange}/>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Name <span className="required">*</span></label>
              <input placeholder="e.g. Fresh Broilers" value={name} onChange={e=>setName(e.target.value)}/>
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={type} onChange={e=>{setType(e.target.value);setEggSize('');}}>
                {PRODUCE_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {isEggs && (
            <div className="form-field">
              <label>Egg Size <span className="required">*</span></label>
              <div style={{display:'flex',gap:'var(--sp-sm)',flexWrap:'wrap'}}>
                {EGG_SIZES.map(s=>(
                  <label key={s} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',
                    padding:'6px 14px',borderRadius:20,
                    border:`2px solid ${eggSize===s?'var(--col-primary)':'var(--col-border)'}`,
                    background:eggSize===s?'var(--col-primary)':'#fff',
                    color:eggSize===s?'#fff':'inherit',fontSize:13,fontWeight:eggSize===s?600:400,transition:'all .15s'}}>
                    <input type="radio" name="egg_size" value={s} checked={eggSize===s} onChange={()=>setEggSize(s)} style={{display:'none'}}/>
                    🥚 {s.charAt(0).toUpperCase()+s.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label>Quantity <span className="required">*</span></label>
              <input type="number" min="1" placeholder="e.g. 50" value={qty} onChange={e=>setQty(e.target.value)}/>
            </div>
            <div className="form-field">
              <label>Unit</label>
              <select value={unit} onChange={e=>setUnit(e.target.value)}>
                {['bird','kg','crate','tray','dozen','bag'].map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Price (GHS) <span className="required">*</span></label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 45.00" value={price} onChange={e=>setPrice(e.target.value)}/>
            </div>
          </div>

          {toArray<Farm>(farms.data).length > 0 && (
            <div className="form-field">
              <label>Farm</label>
              <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
                <option value="">— Select farm —</option>
                {toArray<Farm>(farms.data).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-field">
            <label>Description</label>
            <textarea rows={2} placeholder="Describe the produce quality, weight range, availability…" value={desc} onChange={e=>setDesc(e.target.value)}/>
          </div>

          {/* ── Contact & Payment ───────────────────────────────── */}
          <div style={{borderTop:'1px solid var(--col-border)',paddingTop:'var(--sp-md)',marginTop:'var(--sp-sm)'}}>
            <p style={{fontSize:13,fontWeight:600,marginBottom:'var(--sp-sm)',color:'var(--col-text)'}}>
              Contact &amp; Payment
            </p>

            <div className="form-field">
              <label style={{display:'flex',alignItems:'center',gap:6}}><Phone size={13}/> Contact Phone</label>
              <input
                type="tel"
                placeholder="e.g. 024 000 0000"
                value={contactPhone}
                onChange={e=>setContactPhone(e.target.value)}
              />
              <span style={{fontSize:11,color:'var(--col-muted)'}}>Buyers will see this number to coordinate pickup/delivery.</span>
            </div>

            <div className="form-field">
              <label>Accepted Payment Methods <span className="required">*</span></label>
              <div style={{display:'flex',gap:'var(--sp-sm)',flexWrap:'wrap',marginTop:4}}>
                {PAYMENT_OPTIONS.map(opt => {
                  const active = paymentMethods[opt.key as keyof typeof paymentMethods];
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => togglePayment(opt.key as keyof typeof paymentMethods)}
                      style={{
                        padding:'7px 14px',borderRadius:20,fontSize:13,cursor:'pointer',
                        border:`2px solid ${active?'var(--col-primary)':'var(--col-border)'}`,
                        background:active?'var(--col-primary)':'#fff',
                        color:active?'#fff':'inherit',fontWeight:active?600:400,
                        transition:'all .15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <span style={{fontSize:11,color:'var(--col-muted)',marginTop:4,display:'block'}}>
                Select all that apply. Buyers will see these options when placing an order.
              </span>
            </div>
          </div>

          <Button disabled={!name||!qty||!price||saving||(isEggs&&!eggSize)} onClick={handleCreate} style={{width:'100%',marginTop:'var(--sp-sm)'}}>
            {saving?'Publishing…':'Publish Listing'}
          </Button>
        </Card>
      )}

      {/* ── My listings ─────────────────────────────────────────── */}
      <SectionTitle>My Listings ({myListings.length})</SectionTitle>
      <Card style={{marginBottom:'var(--sp-xl)'}}>
        {listings.loading ? (
          <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
        ) : myListings.length === 0 ? (
          <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No listings yet. Add your first produce listing above.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Photo</th><th>Name</th><th>Type</th><th>Qty</th><th>Price</th><th>Contact</th><th>Payment</th><th>Status</th><th>Rating</th></tr></thead>
            <tbody>
              {myListings.map(p=>(
                <tr key={p.id}>
                  <td>
                    {(
                      <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--col-border)' }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🐔</div>
                        {p.photo && (
                          <img src={p.photo} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </div>
                    )}
                  </td>
                  <td><strong>{p.name}</strong>{p.egg_size && <span style={{fontSize:11,color:'var(--col-muted)',display:'block'}}>{p.egg_size} eggs</span>}</td>
                  <td style={{textTransform:'capitalize'}}>{p.produce_type.replace('_',' ')}</td>
                  <td>{p.quantity_available ?? p.quantity} {p.unit}</td>
                  <td>GHS {parseFloat(p.price).toLocaleString()}</td>
                  <td style={{fontSize:12}}>
                    {(p as {contact_phone?:string}).contact_phone
                      ? <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Phone size={11}/>{(p as {contact_phone?:string}).contact_phone}</span>
                      : <span style={{color:'var(--col-muted)'}}>—</span>}
                  </td>
                  <td>
                    <span style={{display:'inline-flex',gap:4,flexWrap:'wrap'}}>
                      {(p as {accepts_momo?:boolean}).accepts_momo          && <Badge variant="warning">📱 MoMo</Badge>}
                      {(p as {accepts_hubtel_momo?:boolean}).accepts_hubtel_momo && <Badge variant="warning">📲 MoMo (Other)</Badge>}
                      {(p as {accepts_card?:boolean}).accepts_card           && <Badge variant="info">💳 Card</Badge>}
                      {(p as {accepts_bank_transfer?:boolean}).accepts_bank_transfer && <Badge variant="info">🏦 Bank</Badge>}
                      {(p as {accepts_cod?:boolean}).accepts_cod             && <Badge variant="success">💵 CoD</Badge>}
                    </span>
                  </td>
                  <td><Badge variant={p.status==='active'?'success':p.status==='sold_out'?'warning':'neutral'}>{p.status.replace('_',' ')}</Badge></td>
                  <td>{parseFloat(p.avg_rating)>0?`★ ${parseFloat(p.avg_rating).toFixed(1)}`:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Incoming orders ─────────────────────────────────────── */}
      <SectionTitle>
        Incoming Orders ({myOrders.length})
        {newOrders > 0 && (
          <span style={{marginLeft:8,background:'#c0392b',color:'#fff',fontSize:11,fontWeight:700,
            padding:'2px 8px',borderRadius:20,verticalAlign:'middle'}}>
            {newOrders} new
          </span>
        )}
      </SectionTitle>
      <Card>
        {orders.loading ? (
          <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
        ) : myOrders.length === 0 ? (
          <div style={{padding:'var(--sp-xl)',textAlign:'center'}}>
            <Package size={32} style={{color:'var(--col-muted)',marginBottom:8}}/>
            <p style={{color:'var(--col-muted)'}}>No orders received yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Item(s)</th>
                <th>Buyer</th>
                <th>Fulfilment</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map(o=>(
                <tr key={o.id} style={o.status==='pending'?{background:'#fffdf0'}:{}}>
                  <td className="data-table__mono" style={{fontWeight:600}}>{o.reference||o.id.slice(0,8)}</td>
                  <td>
                    {o.items?.map(i=>(
                      <div key={i.id} style={{fontSize:12}}>
                        <strong>{i.produce_name}</strong>
                        <span style={{color:'var(--col-muted)'}}> × {i.quantity} @ GHS {parseFloat(i.unit_price).toLocaleString()}</span>
                      </div>
                    ))}
                  </td>
                  <td style={{fontSize:13}}>{o.buyer_name||'—'}</td>
                  <td><DeliveryBadge order={o}/>{o.delivery_address&&<div style={{fontSize:11,color:'var(--col-muted)',marginTop:2}}>{o.delivery_address}</div>}</td>
                  <td>
                    <Badge variant={o.payment_method==='cash_on_delivery'?'neutral':'warning'}>
                      {o.payment_method==='cash_on_delivery'?'💵 CoD':
                       o.payment_method==='momo'?'📱 MoMo':
                       o.payment_method==='card'?'💳 Card':'🏦 Bank'}
                    </Badge>
                  </td>
                  <td><strong>GHS {parseFloat(o.total_amount).toLocaleString()}</strong></td>
                  <td className="data-table__muted">{new Date(o.created_at).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}</td>
                  <td><Badge variant={ORDER_STATUS_BADGE[o.status]??'neutral'}>{o.status}</Badge></td>
                  <td>
                    {o.status==='pending' && (
                      <Button size="sm" disabled={confirming===o.id} onClick={()=>handleConfirm(o.id)}>
                        {confirming===o.id?'…':'Confirm'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
