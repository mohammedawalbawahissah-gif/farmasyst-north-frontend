import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, FileCheck, BarChart3 } from 'lucide-react';
import { toArray } from '../../lib/api';
import { PageHeader, StatCard, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { farmsService } from '../../lib/services/farms';
import '../farmer/farmer.css';
import './investor.css';

export default function InvestorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const farms      = useAsync(() => farmsService.list(), []);

  const ags           = toArray(agreements.data);
  const allFarms      = toArray(farms.data);
  const active        = ags.filter(a => a.status === 'active');
  const totalAmt      = ags.reduce((s, a) => s + parseFloat(a.amount), 0);
  const uniqueFarmers = new Set(ags.map(a => a.farmer)).size;

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
            : (toArray(farms.data).length) === 0
            ? <Card><p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No farmer profiles available yet.</p></Card>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
                {farms.data!.results.slice(0,5).map(f => (
                  <Card key={f.id} className="farmer-match-card">
                    <div className="farmer-match-card__avatar">{f.name.charAt(0)}</div>
                    <div className="farmer-match-card__info">
                      <span className="farmer-match-card__name">{f.name}</span>
                      <span className="farmer-match-card__meta">{f.district}, {f.region} · {f.flock_size.toLocaleString()} birds · {f.flock_type}</span>
                    </div>
                    <div className="farmer-match-card__ask"><strong>{f.flock_type}</strong><span>flock</span></div>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/investor/farmers/${f.id}`)}>View Profile</Button>
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
    </div>
  );
}