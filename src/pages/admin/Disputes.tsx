import { PageHeader, Card, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { toArray } from '../../lib/api';
import { displayName } from '../../types';
import './admin.css';

export default function AdminDisputes() {
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const ags = toArray(agreements.data);
  const defaulted = ags.filter(a => a.status === 'defaulted');
  const cancelled = ags.filter(a => a.status === 'cancelled');

  return (
    <div>
      <PageHeader title="Dispute Resolution" subtitle="Mediate conflicts between farmers and investors." />

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--sp-md)',marginBottom:'var(--sp-xl)'}}>
        <Card style={{textAlign:'center',padding:'var(--sp-xl)'}}>
          <div style={{fontSize:36,fontWeight:700,color:'var(--col-danger)'}}>{defaulted.length}</div>
          <div style={{fontSize:14,color:'var(--col-muted)'}}>Defaulted agreements</div>
        </Card>
        <Card style={{textAlign:'center',padding:'var(--sp-xl)'}}>
          <div style={{fontSize:36,fontWeight:700,color:'var(--col-warning)'}}>{cancelled.length}</div>
          <div style={{fontSize:14,color:'var(--col-muted)'}}>Cancelled agreements</div>
        </Card>
      </div>

      <SectionTitle>Defaulted Agreements</SectionTitle>
      <Card style={{marginBottom:'var(--sp-xl)'}}>
        {agreements.loading
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
          : defaulted.length === 0
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No defaulted agreements — good standing.</p>
          : (
            <table className="data-table">
              <thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Farmer</th><th>Investor</th><th>Start Date</th></tr></thead>
              <tbody>
                {defaulted.map(ag => (
                  <tr key={ag.id}>
                    <td className="data-table__mono">{ag.reference}</td>
                    <td>{ag.credit_type}</td>
                    <td><strong>GHS {parseFloat(ag.amount).toLocaleString()}</strong></td>
                    <td>{displayName(ag.farmer)}</td>
                    <td>{displayName(ag.investor)}</td>
                    <td className="data-table__muted">{ag.start_date ? new Date(ag.start_date).toLocaleDateString('en-GH') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>

      <SectionTitle>Cancelled Agreements</SectionTitle>
      <Card>
        {cancelled.length === 0
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No cancelled agreements.</p>
          : (
            <table className="data-table">
              <thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Created</th></tr></thead>
              <tbody>
                {cancelled.map(ag => (
                  <tr key={ag.id}>
                    <td className="data-table__mono">{ag.reference}</td>
                    <td>{ag.credit_type}</td>
                    <td>GHS {parseFloat(ag.amount).toLocaleString()}</td>
                    <td className="data-table__muted">{new Date(ag.created_at).toLocaleDateString('en-GH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  );
}