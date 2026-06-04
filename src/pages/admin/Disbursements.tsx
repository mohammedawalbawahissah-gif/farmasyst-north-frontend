import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { paymentsService } from '../../lib/services/payments';
import './admin.css';

const STATUS_BADGE: Record<string, 'warning'|'success'|'danger'|'neutral'> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

const METHOD_LABELS: Record<string, string> = {
  momo: 'MTN MoMo', paystack: 'Paystack', cash: 'Cash', in_kind: 'In-Kind',
};

export default function AdminDisbursements() {
  const requests = useAsync(() => paymentsService.listDisbursementRequests(), []);

  const [approving,    setApproving]    = useState<string|null>(null);
  const [rejecting,    setRejecting]    = useState<string|null>(null);
  const [actionId,     setActionId]     = useState<string|null>(null);
  const [actionType,   setActionType]   = useState<'approve'|'reject'|null>(null);
  const [selMethod,    setSelMethod]    = useState<'momo'|'paystack'|'cash'|'in_kind'>('momo');
  const [adminNote,    setAdminNote]    = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const all      = toArray(requests.data);
  const pending  = all.filter(r => r.status === 'pending');
  const approved = all.filter(r => r.status === 'approved');
  const rejected = all.filter(r => r.status === 'rejected');
  const totalPendingGHS = pending.reduce((s, r) => s + parseFloat(r.amount), 0);

  const openApprove = (id: string, method: string) => {
    setActionId(id);
    setActionType('approve');
    setSelMethod((method as typeof selMethod) || 'momo');
    setAdminNote('');
    setError('');
  };

  const openReject = (id: string) => {
    setActionId(id);
    setActionType('reject');
    setRejectReason('');
    setError('');
  };

  const handleApprove = async () => {
    if (!actionId) return;
    setApproving(actionId); setError(''); setSuccess('');
    try {
      await paymentsService.approveDisbursementRequest(actionId, {
        method: selMethod,
        notes: adminNote,
      });
      setSuccess('Disbursement approved. Funds are being processed and the repayment schedule has been generated.');
      setActionId(null); setActionType(null);
      requests.refetch();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Approval failed. Please try again.');
    }
    finally { setApproving(null); }
  };

  const handleReject = async () => {
    if (!actionId || !rejectReason.trim()) {
      setError('Please provide a rejection reason.');
      return;
    }
    setRejecting(actionId); setError(''); setSuccess('');
    try {
      await paymentsService.rejectDisbursementRequest(actionId, rejectReason);
      setSuccess('Disbursement request rejected. The investor has been notified.');
      setActionId(null); setActionType(null);
      requests.refetch();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Rejection failed. Please try again.');
    }
    finally { setRejecting(null); }
  };

  return (
    <div>
      <PageHeader
        title="Disbursements"
        subtitle="Review investor-initiated disbursement requests, approve payouts, and track repayment schedules."
      />

      {/* Stats */}
      <div className="grid-4" style={{marginBottom:'var(--sp-xl)'}}>
        <StatCard label="Pending Requests" value={pending.length}  sub={`GHS ${totalPendingGHS.toLocaleString()} queued`}  accent="#E8A020" />
        <StatCard label="Approved"         value={approved.length} sub="Funds disbursed"             accent="#4A7C2F" />
        <StatCard label="Rejected"         value={rejected.length} sub="Requests declined"           accent="#C0392B" />
        <StatCard label="Total Requests"   value={all.length}      sub="All time"                    accent="#1A4A6B" />
      </div>

      {error   && <p className="form-error"   style={{marginBottom:'var(--sp-md)'}}>{error}</p>}
      {success && <p className="form-success" style={{marginBottom:'var(--sp-md)'}}>{success}</p>}

      {/* ── Approve / Reject Modal ──────────────────────────────────────── */}
      {actionId && actionType === 'approve' && (() => {
        const req = all.find(r => r.id === actionId);
        if (!req) return null;
        return (
          <Card style={{borderLeft:'3px solid var(--col-success)', marginBottom:'var(--sp-xl)'}}>
            <SectionTitle>Approve Disbursement — {req.reference}</SectionTitle>
            <div style={{fontSize:13,color:'var(--col-muted)',marginBottom:'var(--sp-sm)'}}>
              Farmer: <strong>{req.farmer_name}</strong> · Agreement: <strong>{req.agreement_reference}</strong> · Amount: <strong>GHS {parseFloat(req.amount).toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-sm)',maxWidth:400}}>
              <label style={{fontSize:13,fontWeight:500}}>
                Disbursement Method
                <select
                  className="form-input"
                  value={selMethod}
                  onChange={e => setSelMethod(e.target.value as typeof selMethod)}
                  style={{marginTop:4}}
                >
                  <option value="momo">MTN MoMo</option>
                  <option value="paystack">Paystack</option>
                  <option value="cash">Cash</option>
                  <option value="in_kind">In-Kind (Inputs)</option>
                </select>
              </label>
              <label style={{fontSize:13,fontWeight:500}}>
                Admin Note (optional)
                <textarea
                  className="form-input"
                  placeholder="Internal notes about this disbursement…"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={2}
                  style={{marginTop:4,resize:'none'}}
                />
              </label>
              <div style={{display:'flex',gap:'var(--sp-xs)'}}>
                <Button disabled={!!approving} onClick={handleApprove}>
                  {approving === actionId ? 'Approving…' : '✓ Approve & Disburse'}
                </Button>
                <Button variant="secondary" onClick={() => { setActionId(null); setActionType(null); }}>
                  Cancel
                </Button>
              </div>
              <p style={{fontSize:12,color:'var(--col-muted)'}}>
                ⚠ This will trigger the payout and auto-generate the farmer's repayment schedule.
              </p>
            </div>
          </Card>
        );
      })()}

      {actionId && actionType === 'reject' && (() => {
        const req = all.find(r => r.id === actionId);
        if (!req) return null;
        return (
          <Card style={{borderLeft:'3px solid var(--col-danger)', marginBottom:'var(--sp-xl)'}}>
            <SectionTitle>Reject Disbursement — {req.reference}</SectionTitle>
            <div style={{fontSize:13,color:'var(--col-muted)',marginBottom:'var(--sp-sm)'}}>
              Farmer: <strong>{req.farmer_name}</strong> · Agreement: <strong>{req.agreement_reference}</strong> · Amount: <strong>GHS {parseFloat(req.amount).toLocaleString()}</strong>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-sm)',maxWidth:400}}>
              <label style={{fontSize:13,fontWeight:500}}>
                Rejection Reason <span style={{color:'var(--col-danger)'}}>*</span>
                <textarea
                  className="form-input"
                  placeholder="Explain why this request is being rejected…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  style={{marginTop:4,resize:'none'}}
                />
              </label>
              <div style={{display:'flex',gap:'var(--sp-xs)'}}>
                <Button variant="danger" disabled={!!rejecting} onClick={handleReject}>
                  {rejecting === actionId ? 'Rejecting…' : '✗ Reject Request'}
                </Button>
                <Button variant="secondary" onClick={() => { setActionId(null); setActionType(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ── Pending Requests ────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <>
          <SectionTitle>Pending Review ({pending.length})</SectionTitle>
          <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-sm)',marginBottom:'var(--sp-xl)'}}>
            {pending.map(req => (
              <Card key={req.id} style={{borderLeft:'3px solid var(--col-warning)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'var(--sp-sm)'}}>
                  <div>
                    <div style={{fontWeight:600,marginBottom:4}}>
                      {req.reference} — <span style={{color:'var(--col-muted)',fontWeight:400}}>{req.agreement_reference}</span>
                    </div>
                    <div style={{fontSize:13}}>
                      Farmer: <strong>{req.farmer_name}</strong> · Investor: <strong>{req.requested_by_name}</strong>
                    </div>
                    <div style={{fontSize:13,marginTop:2}}>
                      Amount: <strong>GHS {parseFloat(req.amount).toLocaleString()}</strong> · Method: <strong>{METHOD_LABELS[req.method] || req.method}</strong>
                    </div>
                    {req.note && (
                      <div style={{fontSize:12,color:'var(--col-muted)',marginTop:4}}>
                        Investor note: "{req.note}"
                      </div>
                    )}
                    <div style={{fontSize:12,color:'var(--col-muted)',marginTop:2}}>
                      Submitted: {new Date(req.created_at).toLocaleDateString('en-GH')}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'var(--sp-xs)',flexShrink:0}}>
                    <Button size="sm" onClick={() => openApprove(req.id, req.method)}>
                      ✓ Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openReject(req.id)}>
                      ✗ Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── All Requests Table ──────────────────────────────────────────── */}
      <SectionTitle>All Disbursement Requests ({all.length})</SectionTitle>
      <Card>
        {requests.loading
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
          : all.length === 0
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No disbursement requests yet.</p>
          : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th><th>Agreement</th><th>Farmer</th><th>Investor</th>
                  <th>Amount</th><th>Method</th><th>Status</th><th>Reviewed By</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {all.map(req => (
                  <tr key={req.id}>
                    <td className="data-table__mono">{req.reference}</td>
                    <td className="data-table__mono">{req.agreement_reference}</td>
                    <td>{req.farmer_name}</td>
                    <td>{req.requested_by_name}</td>
                    <td><strong>GHS {parseFloat(req.amount).toLocaleString()}</strong></td>
                    <td>{METHOD_LABELS[req.method] || req.method}</td>
                    <td>
                      <Badge variant={STATUS_BADGE[req.status]}>{req.status}</Badge>
                      {req.status === 'rejected' && req.rejection_reason && (
                        <div style={{fontSize:11,color:'var(--col-danger)',marginTop:2,maxWidth:160}}>{req.rejection_reason}</div>
                      )}
                    </td>
                    <td className="data-table__muted">{req.reviewed_by_name || '—'}</td>
                    <td className="data-table__muted">{new Date(req.created_at).toLocaleDateString('en-GH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  );
}
