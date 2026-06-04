import { PageHeader, Card, SectionTitle, StatCard } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { paymentsService } from '../../lib/services/payments';
import { farmsService } from '../../lib/services/farms';
import { BarChart3 } from 'lucide-react';
import './investor.css';

export default function ImpactReports() {
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const schedules  = useAsync(() => paymentsService.listSchedules(), []);
  const farms      = useAsync(() => farmsService.list(), []);

  const ags          = toArray(agreements.data);
  const allSchedules = toArray(schedules.data);
  const allFarms     = toArray(farms.data);

  const totalDisbursed  = ags.filter(a=>a.status==='active'||a.status==='completed').reduce((s,a)=>s+parseFloat(a.amount),0);
  const totalRepaid     = allSchedules.filter(s=>s.status==='paid').reduce((s,r)=>s+parseFloat(r.amount_paid),0);
  const repayRate       = totalDisbursed > 0 ? Math.round((totalRepaid/totalDisbursed)*100) : 0;
  const totalBirds      = allFarms.reduce((s,f)=>s+f.flock_size,0);
  const uniqueFarmers   = new Set(ags.map(a=>a.farmer)).size;

  return (
    <div>
      <PageHeader title="Impact Reports" subtitle="Measuring the development outcomes of your investments." />

      <div className="grid-4" style={{ marginBottom:'var(--sp-xl)' }}>
        <StatCard label="Farmers Reached"   value={uniqueFarmers} sub="Supported with credit" icon={<BarChart3 size={16}/>} accent="#4A7C2F" />
        <StatCard label="Capital Deployed"  value={`GHS ${totalDisbursed.toLocaleString()}`} sub="Total disbursed" accent="#1A4A6B" />
        <StatCard label="Repayment Rate"    value={`${repayRate}%`} sub="On-time repayments" accent="#E8A020" />
        <StatCard label="Total Birds Tracked" value={totalBirds.toLocaleString()} sub="Across all farms" accent="#5C2D8B" />
      </div>

      <div className="investor-grid-main">
        <div>
          <SectionTitle>Credit by Type</SectionTitle>
          <Card>
            {(['funding','inputs','training'] as const).map(type => {
              const typeAgs = ags.filter(a=>a.credit_type===type);
              const typeAmt = typeAgs.reduce((s,a)=>s+parseFloat(a.amount),0);
              const pct     = totalDisbursed > 0 ? Math.round((typeAmt/totalDisbursed)*100) : 0;
              return (
                <div key={type} style={{marginBottom:'var(--sp-md)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span style={{textTransform:'capitalize'}}>{type}</span>
                    <span>{typeAgs.length} agreements · GHS {typeAmt.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{background:'var(--col-border)',borderRadius:4,height:8}}>
                    <div style={{width:`${pct}%`,background:'var(--col-primary)',height:8,borderRadius:4}} />
                  </div>
                </div>
              );
            })}
          </Card>

          <SectionTitle style={{marginTop:'var(--sp-lg)'}}>Agreements by Status</SectionTitle>
          <Card>
            {(['active','completed','defaulted','pending_signature','cancelled'] as const).map(status => {
              const count = ags.filter(a=>a.status===status).length;
              return count > 0 ? (
                <div key={status} className="repayment-row">
                  <span style={{textTransform:'capitalize'}}>{status.replace('_',' ')}</span>
                  <strong>{count}</strong>
                </div>
              ) : null;
            })}
          </Card>
        </div>

        <div>
          <SectionTitle>Repayment Performance</SectionTitle>
          <Card>
            <div className="repayment-row"><span>Total Scheduled</span><strong>{allSchedules.length} instalments</strong></div>
            <div className="repayment-row"><span>Paid on time</span><strong style={{color:'var(--col-success)'}}>{allSchedules.filter(s=>s.status==='paid').length}</strong></div>
            <div className="repayment-row"><span>Overdue</span><strong style={{color:'var(--col-danger)'}}>{allSchedules.filter(s=>s.status==='overdue').length}</strong></div>
            <div className="repayment-row"><span>Pending</span><strong style={{color:'var(--col-warning)'}}>{allSchedules.filter(s=>s.status==='pending').length}</strong></div>
            <div style={{marginTop:'var(--sp-md)'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                <span>Overall repayment rate</span><span>{repayRate}%</span>
              </div>
              <div style={{background:'var(--col-border)',borderRadius:4,height:10}}>
                <div style={{width:`${repayRate}%`,background:repayRate>=75?'var(--col-success)':repayRate>=50?'var(--col-warning)':'var(--col-danger)',height:10,borderRadius:4}} />
              </div>
            </div>
          </Card>

          <SectionTitle style={{marginTop:'var(--sp-lg)'}}>Farm Infrastructure</SectionTitle>
          <Card>
            <div className="repayment-row"><span>Farms with water source</span><strong>{allFarms.filter(f=>f.has_water_source).length} / {allFarms.length}</strong></div>
            <div className="repayment-row"><span>Farms with electricity</span><strong>{allFarms.filter(f=>f.has_electricity).length} / {allFarms.length}</strong></div>
            <div className="repayment-row"><span>Active farms</span><strong>{allFarms.filter(f=>f.is_active).length}</strong></div>
          </Card>
        </div>
      </div>
    </div>
  );
}