import { useAsync } from '../../lib/hooks/useAsync';
import { inputDealerService } from '../../lib/services/inputDealer';
import { toArray } from '../../lib/api';
import { PageHeader, Card, StatCard, SectionTitle } from '../../components/ui';
import { Package, ShoppingBag, Store, TrendingUp } from 'lucide-react';
import type { FarmInput } from '../../types';
import { useAuth } from '../../lib/hooks/useAuth';
import '../farmer/farmer.css';

export default function InputDealerDashboard() {
  const { user } = useAuth();
  const listings = useAsync(() => inputDealerService.listMyListings(), []);
  const all = toArray<FarmInput>(listings.data);
  const active      = all.filter(l => l.is_available).length;
  const outOfStock  = all.filter(l => !l.is_available).length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.first_name ?? ''}`}
        subtitle="Manage your farm input listings and reach poultry farmers across Ghana."
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'var(--sp-md)', marginBottom:'var(--sp-lg)' }}>
        <StatCard label="Total Listings"  value={all.length}    icon={<Package size={20}/>}    accent="var(--col-primary)" />
        <StatCard label="Active"          value={active}        icon={<Store size={20}/>}       accent="var(--col-success)" />
        <StatCard label="Out of Stock"    value={outOfStock}    icon={<ShoppingBag size={20}/>} accent="var(--col-warning)" />
        <StatCard label="Categories"      value={new Set(all.map(l => l.input_type)).size} icon={<TrendingUp size={20}/>} accent="#7C3AED" />
      </div>

      <SectionTitle>Recent Listings</SectionTitle>
      {listings.loading ? <p style={{ color:'var(--col-muted)' }}>Loading…</p>
      : all.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'3rem', color:'var(--col-muted)' }}>
          <Package size={32} style={{ opacity:.3, marginBottom:'1rem' }} />
          <p>No listings yet. Go to Listings to add your first product.</p>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
          {all.slice(0, 5).map(l => (
            <Card key={l.id}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <strong style={{ fontSize:14 }}>{l.name}</strong>
                  <p style={{ fontSize:13, color:'var(--col-muted)', margin:'2px 0' }}>{l.brand} · {l.unit} · GHS {l.price}</p>
                </div>
                <span style={{ fontSize:12, color: l.is_available ? 'var(--col-success)' : 'var(--col-danger)' }}>
                  {l.is_available ? '● Available' : '● Out of Stock'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
