import { useState } from 'react';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { inputDealerService } from '../../lib/services/inputDealer';
import { toArray } from '../../lib/api';
import { Package, Phone, MapPin } from 'lucide-react';
import type { FarmInput } from '../../types';
import './farmer.css';

const INPUT_TYPES = [
  { value:'', label:'All Types' },
  { value:'feed', label:'🌾 Feed' },
  { value:'vaccine', label:'💉 Vaccine' },
  { value:'medication', label:'💊 Medication' },
  { value:'equipment', label:'🔧 Equipment' },
  { value:'supplement', label:'🧪 Supplement' },
  { value:'disinfectant', label:'🧴 Disinfectant' },
  { value:'other', label:'📦 Other' },
];

export default function FarmerFarmInputs() {
  const inputs  = useAsync(() => inputDealerService.listInputs(), []);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');

  const all = toArray<FarmInput>(inputs.data);
  const shown = all.filter(l =>
    l.is_available &&
    (typeFilter === '' || l.input_type === typeFilter) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.brand?.toLowerCase().includes(search.toLowerCase()))
  );

  const INPUT_LABEL: Record<string,string> = { feed:'🌾 Feed', vaccine:'💉 Vaccine', medication:'💊 Medication', equipment:'🔧 Equipment', supplement:'🧪 Supplement', disinfectant:'🧴 Disinfectant', other:'📦 Other' };

  return (
    <div>
      <PageHeader title="Farm Inputs" subtitle="Source feed, vaccines, medications, and equipment from verified dealers." />

      <div style={{ display:'flex', gap:'var(--sp-sm)', marginBottom:'var(--sp-md)', flexWrap:'wrap', alignItems:'center' }}>
        <input
          className="form-input"
          placeholder="Search products or brands…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{ maxWidth:240 }}
        />
        <select className="form-input" style={{ maxWidth:180 }} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          {INPUT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {inputs.loading ? <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      : shown.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>
          <Package size={32} style={{ opacity:.3, marginBottom:'1rem' }} />
          <p>No inputs found matching your filters.</p>
        </Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'var(--sp-md)' }}>
          {shown.map(l => (
            <Card key={l.id} style={{ display:'flex', flexDirection:'column' }}>
              {l.photo && <img src={l.photo} alt={l.name} style={{ width:'100%', height:140, objectFit:'cover', borderRadius:6, marginBottom:8 }} />}
              <div style={{ flex:1 }}>
                <strong style={{ fontSize:14 }}>{l.name}</strong>
                <Badge variant="neutral">{INPUT_LABEL[l.input_type] ?? l.input_type}</Badge>
                {l.brand && <p style={{ fontSize:12, color:'var(--col-muted)', margin:'4px 0 2px' }}>Brand: {l.brand}</p>}
                <p style={{ fontSize:14, fontWeight:600, margin:'4px 0' }}>GHS {l.price} / {l.unit}</p>
                {l.description && <p style={{ fontSize:13, color:'var(--col-muted)', margin:'0 0 4px' }}>{l.description}</p>}
                <div style={{ fontSize:12, color:'var(--col-muted)' }}>
                  {l.quantity_available > 0 && <span>📦 {l.quantity_available} {l.unit} available · Min: {l.min_order_quantity}</span>}
                  {l.region && <span style={{ display:'block' }}><MapPin size={11}/> {l.region}</span>}
                </div>
              </div>
              <div style={{ marginTop:'var(--sp-sm)', borderTop:'1px solid var(--col-border)', paddingTop:'var(--sp-sm)' }}>
                <p style={{ fontSize:13, fontWeight:500 }}>🏪 {l.business_name}</p>
                <Button size="sm" variant="secondary" style={{ marginTop:4, width:'100%' }} onClick={() => l.dealer_phone ? window.open(`tel:${l.dealer_phone}`) : alert(`Contact ${l.dealer_name} at ${l.business_name}`)}>
                  <Phone size={13}/> Contact Dealer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
