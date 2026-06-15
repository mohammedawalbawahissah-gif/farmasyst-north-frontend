import { useState } from 'react';
import type { Farm } from '../../types';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { adminService } from '../../lib/services/admin';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import { displayName, userId } from '../../types';
import { ArrowRight, CheckCircle, FileCheck, UserCheck } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

export default function AdminMatching() {
  const apps       = useAsync(() => creditService.listApps(), []);
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const investors  = useAsync(() => adminService.listInvestorProfiles(), []);
  const farms      = useAsync(() => farmsService.list(), []);

  const [matching,     setMatching]   = useState<string|null>(null);
  const [selectedInv,  setSelectedInv]= useState('');
  const [acting,       setActing]     = useState<string|null>(null);
  const [msg,          setMsg]        = useState('');
  const [msgType,      setMsgType]    = useState<'success'|'error'>('success');

  const allApps       = toArray<any>(apps.data);
  const allAgreements = toArray<any>(agreements.data);
  const allInvestors  = toArray<any>(investors.data);
  const farmMap       = Object.fromEntries(toArray<Farm>(farms.data).map(f => [userId(f.owner), f]));

  // Real flow: approved (ready to assign) → agreement pending_signature → active → disbursed
  const readyToMatch   = allApps.filter(a => a.status === 'approved');
  const pendingSign    = allAgreements.filter(a => a.status === 'pending_signature');
  const activeAgs      = allAgreements.filter(a => a.status === 'active');
  const disbursed      = allApps.filter(a => a.status === 'disbursed').length;

  const handleMatch = async (appId: string) => {
    if (!selectedInv) return;
    setActing(appId);
    try {
      await creditService.matchToInvestor(appId, selectedInv);
      setMsgType('success');
      setMsg('Matched! An agreement has been created and is now pending both parties\' signatures.');
      setMatching(null); setSelectedInv('');
      apps.refetch(); agreements.refetch();
    } catch {
      setMsgType('error');
      setMsg('Match failed. Check that the investor profile is active and try again.');
    } finally {
      setActing(null);
    }
  };

  const AppCard = ({ app }: { app: typeof allApps[number] }) => {
    const farm = farmMap[userId(app.farmer)];
    const isExpanded = matching === app.id;
    // Check if this app already has an agreement
    const ag = allAgreements.find(a =>
      (typeof a.application === 'string' ? a.application : (a.application as any)?.id) === app.id
    );

    const renderAction = () => {
      if (ag) {
        if (ag.status === 'pending_signature') {
          const farmerSigned   = !!ag.farmer_signed_at;
          const investorSigned = !!ag.investor_signed_at;
          return (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap: 4 }}>
              <Badge variant="warning">Awaiting Signatures</Badge>
              <div style={{ fontSize: 12, color:'var(--col-muted)', textAlign:'right' }}>
                Farmer: {farmerSigned ? '✓ Signed' : '✗ Pending'} &nbsp;·&nbsp;
                Investor: {investorSigned ? '✓ Signed' : '✗ Pending'}
              </div>
            </div>
          );
        }
        if (ag.status === 'active') {
          return (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap: 4 }}>
              <Badge variant="success">Agreement Active</Badge>
              <div style={{ fontSize: 12, color:'var(--col-muted)' }}>{ag.reference}</div>
            </div>
          );
        }
        if (ag.status === 'completed') {
          return <Badge variant="info">Completed</Badge>;
        }
      }
      // No agreement yet — show assign button
      if (!isExpanded) {
        return (
          <Button
            onClick={() => { setMatching(app.id); setSelectedInv(''); }}
            style={{ display:'flex', alignItems:'center', gap: 6 }}
          >
            <UserCheck size={14} /> Assign to Investor
          </Button>
        );
      }
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-xs)', alignItems:'flex-end', minWidth: 260 }}>
          <select
            value={selectedInv}
            onChange={e => setSelectedInv(e.target.value)}
            style={{ width:'100%', fontSize: 13 }}
          >
            <option value="">— Select investor —</option>
            {investors.loading
              ? <option disabled>Loading investors…</option>
              : allInvestors.length === 0
              ? <option disabled>No investors found</option>
              : allInvestors.map((inv: any) => {
                  const id   = inv.user ? userId(inv.user) : inv.id;
                  const name = inv.user ? displayName(inv.user) : (inv.full_name || inv.email);
                  const meta = [inv.organisation, inv.investor_type].filter(Boolean).join(' · ');
                  return (
                    <option key={id} value={id}>
                      {name}{meta ? ` — ${meta}` : ''}
                    </option>
                  );
                })
            }
          </select>
          <div style={{ display:'flex', gap: 6 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setMatching(null); setSelectedInv(''); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedInv || acting === app.id}
              onClick={() => handleMatch(app.id)}
              style={{ display:'flex', alignItems:'center', gap: 4 }}
            >
              <ArrowRight size={13} />
              {acting === app.id ? 'Matching…' : 'Confirm Match'}
            </Button>
          </div>
        </div>
      );
    };

    return (
      <Card style={{ marginBottom: 'var(--sp-sm)', borderLeft: isExpanded ? '4px solid var(--col-primary)' : ag ? '4px solid var(--col-success)' : undefined }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--sp-md)' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', marginBottom: 6 }}>
              <strong>{app.reference}</strong>
              <Badge variant="info">{app.credit_type}</Badge>
              <Badge variant="success">approved</Badge>
            </div>
            <div style={{ fontSize: 13, marginBottom: 3 }}>Farmer: <strong>{displayName(app.farmer)}</strong></div>
            {app.amount_requested && (
              <div style={{ fontSize: 13, marginBottom: 3 }}>
                Amount: <strong>GHS {parseFloat(app.amount_requested).toLocaleString()}</strong>
                {app.repayment_period_months && ` · ${app.repayment_period_months} months`}
              </div>
            )}
            {app.credit_score_at_submission && (
              <div style={{ fontSize: 12, color:'var(--col-muted)' }}>Credit score: {app.credit_score_at_submission}</div>
            )}
            {farm && (
              <div style={{ fontSize: 12, color:'var(--col-muted)', marginTop: 2 }}>
                {farm.name} · {farm.district}, {farm.region} · {farm.flock_size.toLocaleString()} {farm.flock_type}
              </div>
            )}
            {app.purpose && (
              <div style={{ fontSize: 12, color:'var(--col-muted)', marginTop: 4, fontStyle:'italic' }}>{app.purpose}</div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'var(--sp-xs)' }}>
            {renderAction()}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="Farmer–Investor Matching"
        subtitle="Assign approved applications to investors and track contract progress."
      />

      {msg && (
        <div style={{
          background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: msgType === 'success' ? '#166534' : '#b91c1c',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          marginBottom: 'var(--sp-lg)', fontSize: 13,
        }}>{msg}</div>
      )}

      {/* Pipeline summary */}
      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Approved — Ready to Match', count: readyToMatch.length,   color: '#E8A020', icon: <ArrowRight size={15}/> },
          { label: 'Pending Signatures',        count: pendingSign.length,     color: '#1A4A6B', icon: <FileCheck size={15}/> },
          { label: 'Active Agreements',         count: activeAgs.length,       color: '#5C2D8B', icon: <UserCheck size={15}/> },
          { label: 'Completed / Disbursed',     count: disbursed,              color: '#4A7C2F', icon: <CheckCircle size={15}/> },
        ].map(({ label, count, color, icon }) => (
          <Card key={label} style={{ padding:'var(--sp-md)', display:'flex', alignItems:'center', gap: 12 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:color+'22', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:700, lineHeight:1 }}>{apps.loading ? '…' : count}</div>
              <div style={{ fontSize:12, color:'var(--col-muted)', marginTop:2 }}>{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Step 1 */}
      <SectionTitle>Step 1 — Assign to Investor ({readyToMatch.length})</SectionTitle>
      {apps.loading ? (
        <p style={{ color:'var(--col-muted)', marginBottom:'var(--sp-xl)' }}>Loading…</p>
      ) : readyToMatch.length === 0 ? (
        <Card style={{ marginBottom:'var(--sp-xl)' }}>
          <p style={{ padding:'var(--sp-md)', color:'var(--col-muted)' }}>
            No approved applications waiting for investor assignment. Approve applications first in Credit Workflow.
          </p>
        </Card>
      ) : (
        <div style={{ marginBottom:'var(--sp-xl)' }}>
          {readyToMatch.map(app => <AppCard key={app.id} app={app} />)}
        </div>
      )}

      {/* Step 2 */}
      <SectionTitle>Step 2 — Pending Signatures ({pendingSign.length})</SectionTitle>
      {pendingSign.length === 0 ? (
        <Card style={{ marginBottom:'var(--sp-xl)' }}>
          <p style={{ padding:'var(--sp-md)', color:'var(--col-muted)' }}>No agreements awaiting signature.</p>
        </Card>
      ) : (
        <Card style={{ marginBottom:'var(--sp-xl)' }}>
          <table className="data-table">
            <thead>
              <tr><th>Ref</th><th>Farmer</th><th>Investor</th><th>Type</th><th>Amount</th><th>Farmer ✓</th><th>Investor ✓</th></tr>
            </thead>
            <tbody>
              {pendingSign.map(ag => (
                <tr key={ag.id}>
                  <td className="data-table__mono">{ag.reference}</td>
                  <td><strong>{displayName(ag.farmer)}</strong></td>
                  <td>{displayName(ag.investor)}</td>
                  <td>{ag.credit_type}</td>
                  <td>GHS {parseFloat(ag.amount).toLocaleString()}</td>
                  <td>{ag.farmer_signed_at   ? <span style={{color:'var(--col-success)'}}>✓</span> : <span style={{color:'var(--col-muted)'}}>Pending</span>}</td>
                  <td>{ag.investor_signed_at ? <span style={{color:'var(--col-success)'}}>✓</span> : <span style={{color:'var(--col-muted)'}}>Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Step 3 */}
      <SectionTitle>Step 3 — Active Agreements ({activeAgs.length})</SectionTitle>
      {activeAgs.length === 0 ? (
        <Card>
          <p style={{ padding:'var(--sp-md)', color:'var(--col-muted)' }}>No active agreements yet.</p>
        </Card>
      ) : (
        <Card>
          <table className="data-table">
            <thead>
              <tr><th>Ref</th><th>Farmer</th><th>Investor</th><th>Amount</th><th>Start Date</th><th>End Date</th></tr>
            </thead>
            <tbody>
              {activeAgs.map(ag => (
                <tr key={ag.id}>
                  <td className="data-table__mono">{ag.reference}</td>
                  <td><strong>{displayName(ag.farmer)}</strong></td>
                  <td>{displayName(ag.investor)}</td>
                  <td>GHS {parseFloat(ag.amount).toLocaleString()}</td>
                  <td className="data-table__muted">{ag.start_date ? new Date(ag.start_date).toLocaleDateString('en-GH') : '—'}</td>
                  <td className="data-table__muted">{ag.end_date ? new Date(ag.end_date).toLocaleDateString('en-GH') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
