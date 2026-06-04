import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { toArray } from '../../lib/api';
import { displayName } from '../../types';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Clock } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

const STATUS_BADGE: Record<string,'success'|'warning'|'danger'|'neutral'|'info'> = {
  draft:'neutral', submitted:'info', under_review:'warning', scored:'warning',
  matched:'info', approved:'success', disbursed:'success', rejected:'danger', withdrawn:'neutral',
};

type Panel = { id: string; mode: 'review' | 'edit' | 'decline' };

export default function AdminCreditWorkflow() {
  const apps       = useAsync(() => creditService.listApps(), []);
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const navigate   = useNavigate();

  const [filter,    setFilter]  = useState('');
  const [acting,    setActing]  = useState<string|null>(null);
  const [panel,     setPanel]   = useState<Panel|null>(null);
  const [notes,     setNotes]   = useState('');
  const [reason,    setReason]  = useState('');
  const [editData,  setEditData]= useState({ purpose:'', amount_requested:'', repayment_period_months:'' });
  const [msg,       setMsg]     = useState('');
  const [msgType,   setMsgType] = useState<'success'|'error'>('success');

  const allApps      = toArray(apps.data);
  const allAgreements = toArray(agreements.data);
  // Map application id → agreement so we can check whether a contract already exists
  const agreementByApp = Object.fromEntries(
    allAgreements.map(ag => [typeof ag.application === 'string' ? ag.application : (ag.application as any)?.id, ag])
  );
  const filtered     = allApps.filter(a => !filter || a.status === filter);
  const statusCounts = allApps.reduce((acc,a) => { acc[a.status]=(acc[a.status]||0)+1; return acc; }, {} as Record<string,number>);

  const openPanel = (id: string, mode: Panel['mode']) => {
    const app = allApps.find(a => a.id === id);
    if (mode === 'edit' && app) {
      setEditData({
        purpose: app.purpose ?? '',
        amount_requested: app.amount_requested ?? '',
        repayment_period_months: String(app.repayment_period_months ?? ''),
      });
    }
    setNotes(''); setReason(''); setMsg('');
    setPanel({ id, mode });
  };

  const closePanel = () => { setPanel(null); setNotes(''); setReason(''); };

  const handleAction = async (action: 'approve'|'reject'|'edit') => {
    if (!panel) return;
    setActing(panel.id);
    try {
      if (action === 'approve') {
        await creditService.approveApp(panel.id, notes);
        setMsgType('success'); setMsg('Application approved. It is now visible in Farmer Matching for investor assignment.');
      } else if (action === 'reject') {
        await creditService.rejectApp(panel.id, reason, notes);
        setMsgType('success'); setMsg('Application declined and farmer has been notified.');
      } else if (action === 'edit') {
        await creditService.updateApp(panel.id, {
          purpose: editData.purpose,
          amount_requested: editData.amount_requested ? Number(editData.amount_requested) : undefined,
          repayment_period_months: editData.repayment_period_months ? Number(editData.repayment_period_months) : undefined,
        });
        setMsgType('success'); setMsg('Application updated successfully.');
      }
      closePanel();
      apps.refetch();
      agreements.refetch();
    } catch {
      setMsgType('error'); setMsg('Action failed. Please try again.');
    } finally {
      setActing(null);
    }
  };

  const actionFor = (app: typeof allApps[number]) => {
    if (['submitted', 'under_review', 'scored'].includes(app.status)) {
      return (
        <div style={{display:'flex',gap:4}}>
          <Button size="sm" onClick={() => openPanel(app.id, 'review')}>Review</Button>
          <Button size="sm" variant="secondary" onClick={() => openPanel(app.id, 'edit')}>Edit</Button>
        </div>
      );
    }
    if (app.status === 'approved') {
      // Once a contract exists, the app is matched — show status instead of action buttons
      const ag = agreementByApp[app.id];
      if (ag) {
        const agStatus = ag.status;
        if (agStatus === 'pending_signature') {
          return (
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <Clock size={13} style={{color:'var(--col-warning)'}}/>
              <Badge variant="warning">Awaiting Signatures</Badge>
              <Button size="sm" variant="secondary" onClick={() => navigate('/admin/matching')}>View →</Button>
            </div>
          );
        }
        if (agStatus === 'active') {
          return (
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <FileCheck size={13} style={{color:'var(--col-success)'}}/>
              <Badge variant="success">Agreement Active</Badge>
            </div>
          );
        }
      }
      // No agreement yet — can still match or decline
      return (
        <div style={{display:'flex',gap:4}}>
          <Button size="sm" variant="secondary" onClick={() => navigate('/admin/matching')}>Match →</Button>
          <Button size="sm" variant="secondary" onClick={() => openPanel(app.id, 'edit')}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => openPanel(app.id, 'decline')}>Decline</Button>
        </div>
      );
    }
    if (app.status === 'matched') {
      return (
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <Clock size={13} style={{color:'var(--col-warning)'}}/>
          <Badge variant="warning">Awaiting Investor</Badge>
          <Button size="sm" variant="secondary" onClick={() => navigate('/admin/matching')}>View →</Button>
        </div>
      );
    }
    if (app.status === 'disbursed') {
      return <Badge variant="success">Disbursed</Badge>;
    }
    return <span className="data-table__muted">—</span>;
  };

  return (
    <div>
      <PageHeader title="Credit Workflow" subtitle="Review, approve, edit, and manage all credit applications." />

      {msg && (
        <div style={{
          background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: msgType === 'success' ? '#166534' : '#b91c1c',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          marginBottom: 'var(--sp-lg)', fontSize: 13,
        }}>{msg}</div>
      )}

      {/* Filter tabs */}
      <div style={{display:'flex',gap:'var(--sp-sm)',flexWrap:'wrap',marginBottom:'var(--sp-lg)'}}>
        {([
          ['', 'All', allApps.length],
          ['submitted', 'Submitted', statusCounts['submitted']??0],
          ['under_review', 'Under Review', statusCounts['under_review']??0],
          ['approved', 'Approved', statusCounts['approved']??0],
          ['rejected', 'Rejected', statusCounts['rejected']??0],
          ['disbursed', 'Disbursed', statusCounts['disbursed']??0],
        ] as [string,string,number][]).map(([val,label,count]) => (
          <Button key={val} size="sm" variant={filter===val?'primary':'ghost'} onClick={() => setFilter(val)}>
            {label} ({count})
          </Button>
        ))}
      </div>

      {/* Inline panel */}
      {panel && (
        <Card style={{maxWidth:520,marginBottom:'var(--sp-lg)'}}>
          {panel.mode === 'review' && (
            <>
              <h3 style={{marginBottom:'var(--sp-md)'}}>Review Application</h3>
              <div className="form-field">
                <label>Reviewer notes <span style={{color:'var(--col-muted)',fontWeight:400}}>(optional)</span></label>
                <textarea rows={3} placeholder="Add internal notes…" value={notes} onChange={e=>setNotes(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Rejection reason <span style={{color:'var(--col-muted)',fontWeight:400}}>(required to reject)</span></label>
                <input placeholder="e.g. Insufficient collateral…" value={reason} onChange={e=>setReason(e.target.value)} />
              </div>
              <div style={{display:'flex',gap:'var(--sp-sm)'}}>
                <Button variant="secondary" onClick={closePanel}>Cancel</Button>
                <Button disabled={!!acting} onClick={() => handleAction('approve')}>Approve ✓</Button>
                <Button variant="danger" disabled={!reason||!!acting} onClick={() => handleAction('reject')}>Reject ✗</Button>
              </div>
            </>
          )}

          {panel.mode === 'edit' && (
            <>
              <h3 style={{marginBottom:'var(--sp-md)'}}>Edit Application</h3>
              <div className="form-field">
                <label>Purpose</label>
                <textarea rows={2} value={editData.purpose} onChange={e=>setEditData(p=>({...p,purpose:e.target.value}))} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--sp-sm)'}}>
                <div className="form-field">
                  <label>Amount (GHS)</label>
                  <input type="number" value={editData.amount_requested} onChange={e=>setEditData(p=>({...p,amount_requested:e.target.value}))} />
                </div>
                <div className="form-field">
                  <label>Repayment (months)</label>
                  <input type="number" value={editData.repayment_period_months} onChange={e=>setEditData(p=>({...p,repayment_period_months:e.target.value}))} />
                </div>
              </div>
              <div style={{display:'flex',gap:'var(--sp-sm)'}}>
                <Button variant="secondary" onClick={closePanel}>Cancel</Button>
                <Button disabled={!!acting} onClick={() => handleAction('edit')}>Save Changes</Button>
              </div>
            </>
          )}

          {panel.mode === 'decline' && (
            <>
              <h3 style={{marginBottom:'var(--sp-md)'}}>Decline Approved Application</h3>
              <p style={{fontSize:13,color:'var(--col-muted)',marginBottom:'var(--sp-md)'}}>
                This will reverse the approval and reject the application. The farmer will be notified.
              </p>
              <div className="form-field">
                <label>Reason for declining <span style={{color:'var(--col-danger)'}}>*</span></label>
                <input placeholder="e.g. Investor not available, risk reassessment…" value={reason} onChange={e=>setReason(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Additional notes <span style={{color:'var(--col-muted)',fontWeight:400}}>(optional)</span></label>
                <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} />
              </div>
              <div style={{display:'flex',gap:'var(--sp-sm)'}}>
                <Button variant="secondary" onClick={closePanel}>Cancel</Button>
                <Button variant="danger" disabled={!reason||!!acting} onClick={() => handleAction('reject')}>Confirm Decline</Button>
              </div>
            </>
          )}
        </Card>
      )}

      <Card>
        {apps.loading
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
          : filtered.length === 0
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No applications match this filter.</p>
          : (
            <table className="data-table">
              <thead>
                <tr><th>Ref</th><th>Farmer</th><th>Type</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app.id}>
                    <td className="data-table__mono">{app.reference}</td>
                    <td><strong>{displayName(app.farmer)}</strong></td>
                    <td>{app.credit_type}</td>
                    <td>{app.amount_requested ? `GHS ${parseFloat(app.amount_requested).toLocaleString()}` : 'Free'}</td>
                    <td><Badge variant={STATUS_BADGE[app.status]??'neutral'}>{app.status.replace(/_/g,' ')}</Badge></td>
                    <td className="data-table__muted">{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GH') : '—'}</td>
                    <td>{actionFor(app)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  );
}
