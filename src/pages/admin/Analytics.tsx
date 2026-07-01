import { PageHeader, Card, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { adminService } from '../../lib/services/admin';
import { paymentsService } from '../../lib/services/payments';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import type { Farm, CreditApplication, User, RepaymentSchedule } from '../../types';
import { BarChart3 } from 'lucide-react';
import './admin.css';

export default function AdminAnalytics() {
  const apps      = useAsync(() => creditService.listApps(), []);
  const users     = useAsync(() => adminService.listUsers(), []);
  const schedules = useAsync(() => paymentsService.listSchedules(), []);
  const farms     = useAsync(() => farmsService.list(), []);

  const allApps  = toArray<CreditApplication>(apps.data);
  const allUsers = toArray<User>(users.data);
  const allSched = toArray<RepaymentSchedule>(schedules.data);
  const allFarms = toArray<Farm>(farms.data);

  const disbursed     = allSched.filter(s=>s.status==='paid').reduce((s,r)=>s+parseFloat(r.amount_paid),0);
  const totalAmtDue   = allSched.reduce((s,r)=>s+parseFloat(r.amount_due),0);
  const repayRate     = totalAmtDue > 0 ? Math.round((disbursed/totalAmtDue)*100) : 0;
  const totalBirds    = allFarms.reduce((s,f)=>s+f.flock_size,0);

  const appsByType   = allApps.reduce<Record<string,number>>((acc,a)=>{acc[a.credit_type]=(acc[a.credit_type]||0)+1;return acc;},{});
  const appsByStatus = allApps.reduce<Record<string,number>>((acc,a)=>{acc[a.status]=(acc[a.status]||0)+1;return acc;},{});

  return (
    <div>
      <PageHeader title="Analytics & Impact" subtitle="Platform-wide performance metrics and value chain data." />

      <div className="grid-4" style={{marginBottom:'var(--sp-xl)'}}>
        <StatCard label="Total Users"        value={allUsers.length}            sub={`${allUsers.filter(u=>u.role==='farmer').length} farmers`} icon={<BarChart3 size={16}/>} accent="#5C2D8B" />
        <StatCard label="Total Applications" value={allApps.length}             sub={`${allApps.filter(a=>a.status==='disbursed').length} disbursed`} accent="#4A7C2F" />
        <StatCard label="Repayment Rate"     value={`${repayRate}%`}            sub={`GHS ${disbursed.toLocaleString()} recovered`} accent="#1A4A6B" />
        <StatCard label="Total Birds"        value={totalBirds.toLocaleString()} sub="Across all registered farms" accent="#E8A020" />
      </div>

      <div className="investor-grid-main">
        <div>
          <SectionTitle>Applications by Status</SectionTitle>
          <Card>
            {Object.entries(appsByStatus).map(([status, count]) => {
              const pct = allApps.length > 0 ? Math.round((count/allApps.length)*100) : 0;
              return (
                <div key={status} style={{marginBottom:'var(--sp-sm)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span style={{textTransform:'capitalize'}}>{status.replace('_',' ')}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div style={{background:'var(--col-border)',borderRadius:4,height:8}}>
                    <div style={{width:`${pct}%`,background:'var(--col-primary)',height:8,borderRadius:4}} />
                  </div>
                </div>
              );
            })}
          </Card>

          <SectionTitle style={{marginTop:'var(--sp-lg)'}}>Applications by Credit Type</SectionTitle>
          <Card>
            {Object.entries(appsByType).map(([type, count]) => (
              <div key={type} className="repayment-row">
                <span style={{textTransform:'capitalize'}}>{type}</span>
                <strong>{count} ({allApps.length>0?Math.round((count/allApps.length)*100):0}%)</strong>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <SectionTitle>User Metrics</SectionTitle>
          <Card>
            {(['farmer','investor','consumer','admin'] as const).map(role => {
              const roleUsers = allUsers.filter(u=>u.role===role);
              const verified  = roleUsers.filter(u=>u.is_verified).length;
              return (
                <div key={role} style={{marginBottom:'var(--sp-md)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span style={{textTransform:'capitalize'}}>{role}s</span>
                    <span>{roleUsers.length} total, {verified} verified</span>
                  </div>
                  <div style={{background:'var(--col-border)',borderRadius:4,height:6}}>
                    <div style={{width:roleUsers.length>0?`${Math.round((verified/roleUsers.length)*100)}%`:'0%', background:'var(--col-success)',height:6,borderRadius:4}} />
                  </div>
                </div>
              );
            })}
          </Card>

          <SectionTitle style={{marginTop:'var(--sp-lg)'}}>Repayment Summary</SectionTitle>
          <Card>
            <div className="repayment-row"><span>Total Instalments</span><strong>{allSched.length}</strong></div>
            <div className="repayment-row"><span>Paid</span><strong style={{color:'var(--col-success)'}}>{allSched.filter(s=>s.status==='paid').length}</strong></div>
            <div className="repayment-row"><span>Overdue</span><strong style={{color:'var(--col-danger)'}}>{allSched.filter(s=>s.status==='overdue').length}</strong></div>
            <div className="repayment-row"><span>Pending</span><strong style={{color:'var(--col-warning)'}}>{allSched.filter(s=>s.status==='pending').length}</strong></div>
            <div className="repayment-row"><span>Amount Recovered</span><strong>GHS {disbursed.toLocaleString()}</strong></div>
          </Card>
        </div>
      </div>
    </div>
  );
}