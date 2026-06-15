import { PageHeader, Card, Badge, SectionTitle, StatCard } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { paymentsService } from '../../lib/services/payments';
import { TrendingUp } from 'lucide-react';
import type { CreditAgreement, RepaymentSchedule } from '../../types';
import './investor.css';

const AG_BADGE: Record<string, 'success'|'info'|'danger'|'neutral'|'warning'> = {
  active:'success', completed:'info', defaulted:'danger', cancelled:'neutral', pending_signature:'warning',
};

export default function Portfolio() {
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const schedules  = useAsync(() => paymentsService.listSchedules(), []);

  const ags = toArray<CreditAgreement>(agreements.data);
  const totalInvested  = ags.reduce((s,a) => s + parseFloat(a.amount), 0);
  const totalRecovered = (toArray<RepaymentSchedule>(schedules.data)).filter(s=>s.status==='paid').reduce((s,r) => s + parseFloat(r.amount_paid), 0);
  const outstanding    = totalInvested - totalRecovered;

  const byType = ags.reduce((acc, a) => { acc[a.credit_type] = (acc[a.credit_type]||0) + parseFloat(a.amount); return acc; }, {} as Record<string,number>);

  return (
    <div>
      <PageHeader title="My Portfolio" subtitle="Track active investments, repayment status, and ROI." />

      <div className="grid-4" style={{ marginBottom:'var(--sp-xl)' }}>
        <StatCard label="Total Invested"  value={`GHS ${totalInvested.toLocaleString()}`}  sub="All agreements" icon={<TrendingUp size={16}/>} accent="#1A4A6B" />
        <StatCard label="Recovered"       value={`GHS ${totalRecovered.toLocaleString()}`} sub="Repayments received" accent="#4A7C2F" />
        <StatCard label="Outstanding"     value={`GHS ${outstanding.toLocaleString()}`}    sub="Balance remaining" accent="#E8A020" />
        <StatCard label="Recovery Rate"   value={totalInvested>0?`${Math.round((totalRecovered/totalInvested)*100)}%`:'—'} sub="Portfolio average" accent="#5C2D8B" />
      </div>

      <div className="investor-grid-main">
        <div>
          <SectionTitle>All Agreements</SectionTitle>
          <Card>
            {agreements.loading
              ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
              : ags.length === 0
              ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No agreements yet.</p>
              : (
                <table className="data-table">
                  <thead><tr><th>Ref</th><th>Type</th><th>Amount</th><th>Period</th><th>Rate %</th><th>Status</th><th>Start</th></tr></thead>
                  <tbody>
                    {ags.map(ag => (
                      <tr key={ag.id}>
                        <td className="data-table__mono">{ag.reference}</td>
                        <td>{ag.credit_type}</td>
                        <td><strong>GHS {parseFloat(ag.amount).toLocaleString()}</strong></td>
                        <td>{ag.repayment_period_months}mo</td>
                        <td>{parseFloat(ag.interest_rate).toFixed(1)}%</td>
                        <td><Badge variant={AG_BADGE[ag.status]}>{ag.status.replace('_',' ')}</Badge></td>
                        <td className="data-table__muted">{ag.start_date ? new Date(ag.start_date).toLocaleDateString('en-GH') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </Card>
        </div>

        <div>
          <SectionTitle>Investment by Type</SectionTitle>
          <Card>
            {Object.entries(byType).length === 0
              ? <p style={{color:'var(--col-muted)',padding:'var(--sp-md)'}}>No data yet.</p>
              : Object.entries(byType).map(([type, amt]) => (
                <div key={type} className="inv-type-bar__item" style={{marginBottom:'var(--sp-sm)'}}>
                  <span style={{fontSize:13,textTransform:'capitalize'}}>{type}</span>
                  <div className="inv-type-bar__track">
                    <div className="inv-type-bar__fill" style={{ width:`${totalInvested>0?Math.round((amt/totalInvested)*100):0}%`, background:'var(--col-primary)' }} />
                  </div>
                  <span style={{fontSize:13}}>GHS {amt.toLocaleString()}</span>
                </div>
              ))}
          </Card>

          <SectionTitle style={{marginTop:'var(--sp-lg)'}}>Repayment Schedule Overview</SectionTitle>
          <Card>
            {schedules.loading ? <p style={{color:'var(--col-muted)',padding:'var(--sp-md)'}}>Loading…</p>
            : (
              <>
                {(['pending','paid','overdue','waived'] as const).map(status => {
                  const count = (toArray<RepaymentSchedule>(schedules.data)).filter(s=>s.status===status).length;
                  return count > 0 ? (
                    <div key={status} className="repayment-row">
                      <span style={{textTransform:'capitalize'}}>{status}</span>
                      <strong>{count} instalment{count>1?'s':''}</strong>
                    </div>
                  ) : null;
                })}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}