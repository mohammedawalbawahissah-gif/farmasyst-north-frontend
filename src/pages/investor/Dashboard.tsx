import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, FileCheck, BarChart3, X } from 'lucide-react';
import { toArray } from '../../lib/api';
import { PageHeader, StatCard, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import type { CreditAgreement, Farm, FarmerProfile } from '../../types';
import { farmsService } from '../../lib/services/farms';
import { adminService } from '../../lib/services/admin';
import { displayName, userId } from '../../types';
import '../farmer/farmer.css';
import './investor.css';

export default function InvestorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const farms      = useAsync(() => farmsService.list(), []);
  const profiles   = useAsync(() => adminService.listFarmerProfiles(), []);
  const [selectedFarm, setSelectedFarm] = useState<{ farm: Farm; profile?: FarmerProfile } | null>(null);

  const ags           = toArray<CreditAgreement>(agreements.data);
  const allProfiles   = toArray<FarmerProfile>(profiles.data);
  const active        = ags.filter(a => a.status === 'active');
  const totalAmt      = ags.reduce((s, a) => s + parseFloat(a.amount), 0);
  const uniqueFarmers = new Set(ags.map(a => a.farmer)).size;

  // Build map: ownerId → farmerProfile
  const profileMap = Object.fromEntries(
    allProfiles.map((p) => [userId(p.user), p])
  );

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.first_name ?? ''} 📊`}
        subtitle="Your investment portfolio and farmer matches."
        action={
          <Button size="sm" onClick={() => navigate('/investor/opportunities')}>
            View Opportunities
          </Button>
        }
      />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Active Investments" value={active.length} sub="Agreements in progress" icon={<TrendingUp size={16}/>} accent="#1A4A6B" />
        <StatCard label="Total Committed"    value={`GHS ${totalAmt.toLocaleString()}`} sub="All agreements" icon={<FileCheck size={16}/>} accent="#4A7C2F" />
        <StatCard label="Agreements"         value={ags.length} sub={`${ags.filter(a=>a.status==='completed').length} completed`} icon={<BarChart3 size={16}/>} accent="#E8A020" />
        <StatCard label="Farmers Supported"  value={uniqueFarmers} sub="Unique farmers" icon={<Users size={16}/>} accent="#5C2D8B" />
      </div>

      <div className="investor-grid-main">
        <div>
          <SectionTitle>Matched Farmers</SectionTitle>
          {farms.loading
            ? <p style={{color:'var(--col-muted)'}}>Loading…</p>
            : (toArray<Farm>(farms.data).length) === 0
            ? <Card><p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No farmer profiles available yet.</p></Card>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
                {toArray<Farm>(farms.data).slice(0,5).map(f => (
                  <Card key={f.id} className="farmer-match-card">
                    <div className="farmer-match-card__avatar">{f.name.charAt(0)}</div>
                    <div className="farmer-match-card__info">
                      <span className="farmer-match-card__name">{f.name}</span>
                      <span className="farmer-match-card__meta">{f.district}, {f.region} · {f.flock_size.toLocaleString()} birds · {f.flock_type}</span>
                    </div>
                    <div className="farmer-match-card__ask"><strong>{f.flock_type}</strong><span>flock</span></div>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedFarm({ farm: f, profile: profileMap[userId(f.owner)] })}>View Profile</Button>
                  </Card>
                ))}
              </div>
            )}
        </div>

        <div>
          <SectionTitle>Portfolio Summary</SectionTitle>
          <Card>
            <div className="repayment-row"><span>Total Committed</span><strong>GHS {totalAmt.toLocaleString()}</strong></div>
            <div className="repayment-row"><span>Active Agreements</span><strong>{active.length}</strong></div>
            <div className="repayment-row"><span>Completed</span><strong>{ags.filter(a=>a.status==='completed').length}</strong></div>
            <div className="repayment-row"><span>Pending Signature</span><strong>{ags.filter(a=>a.status==='pending_signature').length}</strong></div>
            <div className="repayment-row"><span>Defaulted</span><strong style={{color:'var(--col-danger)'}}>{ags.filter(a=>a.status==='defaulted').length}</strong></div>
          </Card>

          <SectionTitle style={{ marginTop: 'var(--sp-lg)' }}>Recent Agreements</SectionTitle>
          <Card>
            {ags.slice(0,4).length === 0
              ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No agreements yet.</p>
              : ags.slice(0,4).map(ag => (
                <div key={ag.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'var(--sp-sm) 0',borderBottom:'1px solid var(--col-border)'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{ag.reference}</div>
                    <div style={{fontSize:12,color:'var(--col-muted)'}}>{ag.credit_type} · GHS {parseFloat(ag.amount).toLocaleString()}</div>
                  </div>
                  <Badge variant={ag.status==='active'?'success':ag.status==='completed'?'info':ag.status==='defaulted'?'danger':'neutral'}>{ag.status.replace('_',' ')}</Badge>
                </div>
              ))}
          </Card>
        </div>
      </div>

      {/* ── Farmer Profile Modal ───────────────────────────────────────────── */}
      {selectedFarm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--col-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                  {selectedFarm.farm.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{selectedFarm.farm.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 2 }}>{selectedFarm.farm.district}, {selectedFarm.farm.region}</div>
                </div>
              </div>
              <button onClick={() => setSelectedFarm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 10 }}>Farm Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div><span style={{ color: 'var(--col-muted)' }}>Flock Type</span><br /><strong style={{ textTransform: 'capitalize' }}>{selectedFarm.farm.flock_type.replace(/_/g, ' ')}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Flock Size</span><br /><strong>{selectedFarm.farm.flock_size?.toLocaleString()}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Farm Size</span><br /><strong>{selectedFarm.farm.farm_size_acres ? `${selectedFarm.farm.farm_size_acres} acres` : '—'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Status</span><br /><Badge variant={selectedFarm.farm.is_active ? 'success' : 'neutral'}>{selectedFarm.farm.is_active ? 'Active' : 'Inactive'}</Badge></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Water Source</span><br /><strong>{selectedFarm.farm.has_water_source ? '✓ Yes' : '✗ No'}</strong></div>
                  <div><span style={{ color: 'var(--col-muted)' }}>Electricity</span><br /><strong>{selectedFarm.farm.has_electricity ? '✓ Yes' : '✗ No'}</strong></div>
                </div>
              </div>

              {selectedFarm.profile && (
                <div style={{ background: '#f8f6f2', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--col-muted)', marginBottom: 10 }}>Farmer Profile</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div><span style={{ color: 'var(--col-muted)' }}>Name</span><br /><strong>{displayName(selectedFarm.profile.user) || '—'}</strong></div>
                    <div><span style={{ color: 'var(--col-muted)' }}>Experience</span><br /><strong>{selectedFarm.profile.years_of_farming ?? 0} years</strong></div>
                    <div>
                      <span style={{ color: 'var(--col-muted)' }}>Credit Score</span><br />
                      <strong style={{ fontSize: 20, color: 'var(--col-primary)' }}>{parseFloat(selectedFarm.profile.credit_score ?? 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--col-muted)' }}>Verification</span><br />
                      <Badge variant={selectedFarm.profile.verification_status === 'verified' ? 'success' : 'warning'}>
                        {selectedFarm.profile.verification_status ?? 'pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button variant="secondary" onClick={() => setSelectedFarm(null)}>Close</Button>
              <Button onClick={() => { setSelectedFarm(null); navigate('/investor/farmers'); }}>View All Farmers</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}