import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import type { CreditAgreement, DisbursementRequest } from '../../types';
import { paymentsService } from '../../lib/services/payments';
import './investor.css';

const AG_BADGE: Record<string, 'success'|'info'|'danger'|'neutral'|'warning'> = {
  active:'success', completed:'info', defaulted:'danger', cancelled:'neutral', pending_signature:'warning',
};

const DR_BADGE: Record<string, 'warning'|'success'|'danger'> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

export default function Contracts() {
  const agreements  = useAsync(() => creditService.listAgreements(), []);
  const disbReqs    = useAsync(() => paymentsService.listDisbursementRequests(), []);

  const [signing,    setSigning]    = useState<string|null>(null);
  const [generating, setGenerating] = useState<string|null>(null);
  const [requesting, setRequesting] = useState<string|null>(null);
  const [showReqForm, setShowReqForm] = useState<string|null>(null);
  const [reqMethod,  setReqMethod]  = useState<'momo'|'paystack'|'cash'|'in_kind'>('momo');
  const [reqNote,    setReqNote]    = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const handleSign = async (id: string) => {
    setSigning(id); setError(''); setSuccess('');
    try {
      await creditService.signAgreement(id);
      setSuccess('Contract signed successfully. Both parties must sign before it becomes active.');
      agreements.refetch();
    } catch { setError('Signing failed. Please try again.'); }
    finally { setSigning(null); }
  };

  const handleGenerate = async (id: string) => {
    setGenerating(id); setError(''); setSuccess('');
    try {
      await creditService.generateDocument(id);
      setSuccess('e-Contract generated. Both parties can now review and sign it below.');
      agreements.refetch();
    } catch { setError('Document generation failed. Please try again.'); }
    finally { setGenerating(null); }
  };

  const handleRequestDisbursement = async (agreementId: string) => {
    setRequesting(agreementId); setError(''); setSuccess('');
    try {
      await paymentsService.requestDisbursement({
        agreement: agreementId,
        method: reqMethod,
        note: reqNote,
      });
      setSuccess('Disbursement request submitted. The admin will review and approve it shortly.');
      setShowReqForm(null);
      setReqNote('');
      disbReqs.refetch();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg = (data?.detail as string | undefined)
        || (data?.non_field_errors as string[] | undefined)?.[0]
        || (data?.agreement as string[] | undefined)?.[0]
        || (Object.values(data ?? {}).flat()[0] as string | undefined)
        || 'Request failed. Please try again.';
      setError(msg);
    }
    finally { setRequesting(null); }
  };

  const ags    = toArray<CreditAgreement>(agreements.data);
  const drList = toArray<DisbursementRequest>(disbReqs.data);
  const drByAgreement = Object.fromEntries(drList.map(d => [d.agreement, d]));

  const pending      = ags.filter(a => a.status === 'pending_signature' && !a.investor_signed_at);
  const activeAgs    = ags.filter(a => a.status === 'active');
  const needsDisbReq = activeAgs.filter(a => !drByAgreement[a.id]);

  return (
    <div>
      <PageHeader title="Contracts" subtitle="Generate, sign, and manage investment agreements." />

      {error   && <p className="form-error"   style={{marginBottom:'var(--sp-md)'}}>{error}</p>}
      {success && <p className="form-success" style={{marginBottom:'var(--sp-md)'}}>{success}</p>}

      {/* ── Pending Your Signature ──────────────────────────────────────── */}
      {pending.length > 0 && (
        <>
          <SectionTitle>Awaiting Your Signature ({pending.length})</SectionTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)', marginBottom:'var(--sp-xl)' }}>
            {pending.map(ag => (
              <Card key={ag.id} style={{ borderLeft:'3px solid var(--col-warning)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'var(--sp-sm)' }}>
                  <div>
                    <div style={{fontWeight:600}}>{ag.reference} — {ag.credit_type}</div>
                    <div style={{fontSize:13,color:'var(--col-muted)'}}>GHS {parseFloat(ag.amount).toLocaleString()} · {ag.repayment_period_months} months · {ag.interest_rate}% interest</div>
                    <div style={{fontSize:12,color:'var(--col-muted)',marginTop:4}}>
                      Farmer signed: {ag.farmer_signed_at ? '✓ Yes' : '✗ Not yet'} · Investor signed: {ag.investor_signed_at ? '✓ Yes' : '✗ Not yet'}
                    </div>
                  </div>
                  <Button size="sm" disabled={signing === ag.id} onClick={() => handleSign(ag.id)}>
                    {signing === ag.id ? 'Signing…' : 'Sign Contract'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Request Disbursement (active, no request yet) ───────────────── */}
      {needsDisbReq.length > 0 && (
        <>
          <SectionTitle>Ready for Disbursement ({needsDisbReq.length})</SectionTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)', marginBottom:'var(--sp-xl)' }}>
            {needsDisbReq.map(ag => (
              <Card key={ag.id} style={{ borderLeft:'3px solid var(--col-success)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--sp-sm)' }}>
                  <div>
                    <div style={{fontWeight:600}}>{ag.reference} — {ag.credit_type}</div>
                    <div style={{fontSize:13,color:'var(--col-muted)'}}>
                      GHS {parseFloat(ag.amount).toLocaleString()} · {ag.repayment_period_months} months · {ag.interest_rate}% interest
                    </div>
                    <div style={{fontSize:12,color:'var(--col-muted)',marginTop:4}}>
                      Both parties have signed. You can now request disbursement to the farmer.
                    </div>
                  </div>
                  {showReqForm !== ag.id ? (
                    <Button size="sm" variant="primary" onClick={() => setShowReqForm(ag.id)}>
                      💸 Request Disbursement
                    </Button>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-xs)',minWidth:260}}>
                      <select
                        className="form-input"
                        value={reqMethod}
                        onChange={e => setReqMethod(e.target.value as typeof reqMethod)}
                        style={{fontSize:13}}
                      >
                        <option value="momo">MTN MoMo</option>
                        <option value="paystack">Paystack</option>
                        <option value="cash">Cash</option>
                        <option value="in_kind">In-Kind (Inputs)</option>
                      </select>
                      <textarea
                        className="form-input"
                        placeholder="Note to admin (optional)"
                        value={reqNote}
                        onChange={e => setReqNote(e.target.value)}
                        rows={2}
                        style={{fontSize:13,resize:'none'}}
                      />
                      <div style={{display:'flex',gap:'var(--sp-xs)'}}>
                        <Button size="sm" disabled={requesting === ag.id} onClick={() => handleRequestDisbursement(ag.id)}>
                          {requesting === ag.id ? 'Submitting…' : 'Submit Request'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowReqForm(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Disbursement Request Status ─────────────────────────────────── */}
      {drList.length > 0 && (
        <>
          <SectionTitle>Disbursement Requests</SectionTitle>
          <Card style={{marginBottom:'var(--sp-xl)'}}>
            <table className="data-table">
              <thead>
                <tr><th>Reference</th><th>Agreement</th><th>Amount</th><th>Method</th><th>Status</th><th>Submitted</th><th>Reviewed At</th></tr>
              </thead>
              <tbody>
                {drList.map(dr => (
                  <tr key={dr.id}>
                    <td className="data-table__mono">{dr.reference}</td>
                    <td className="data-table__mono">{dr.agreement_reference}</td>
                    <td><strong>GHS {parseFloat(dr.amount).toLocaleString()}</strong></td>
                    <td style={{textTransform:'capitalize'}}>{dr.method.replace('_',' ')}</td>
                    <td>
                      <Badge variant={DR_BADGE[dr.status]}>{dr.status}</Badge>
                      {dr.status === 'rejected' && dr.rejection_reason && (
                        <div style={{fontSize:11,color:'var(--col-danger)',marginTop:2}}>{dr.rejection_reason}</div>
                      )}
                    </td>
                    <td className="data-table__muted">{new Date(dr.created_at).toLocaleDateString('en-GH')}</td>
                    <td className="data-table__muted">{dr.reviewed_at ? new Date(dr.reviewed_at).toLocaleDateString('en-GH') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── All Contracts ───────────────────────────────────────────────── */}
      <SectionTitle>All Contracts ({ags.length})</SectionTitle>
      <Card>
        {agreements.loading
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
          : ags.length === 0
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No contracts yet.</p>
          : (
            <table className="data-table">
              <thead>
                <tr><th>Reference</th><th>Type</th><th>Amount</th><th>Period</th><th>Status</th><th>Disbursed</th><th>Document</th></tr>
              </thead>
              <tbody>
                {ags.map(ag => (
                  <tr key={ag.id}>
                    <td className="data-table__mono">{ag.reference}</td>
                    <td>{ag.credit_type}</td>
                    <td><strong>GHS {parseFloat(ag.amount).toLocaleString()}</strong></td>
                    <td>{ag.repayment_period_months}mo</td>
                    <td><Badge variant={AG_BADGE[ag.status]}>{ag.status.replace('_',' ')}</Badge></td>
                    <td className="data-table__muted">{ag.disbursed_at ? new Date(ag.disbursed_at).toLocaleDateString('en-GH') : '—'}</td>
                    <td>
                      {ag.contract_document ? (
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <a href={ag.contract_document} target="_blank" rel="noreferrer" style={{fontSize:12}}>Download ↓</a>
                          {ag.status === 'pending_signature' && !ag.investor_signed_at && (
                            <Button size="sm" disabled={signing === ag.id} onClick={() => handleSign(ag.id)}>
                              {signing === ag.id ? 'Signing…' : 'Sign'}
                            </Button>
                          )}
                        </div>
                      ) : ag.status === 'pending_signature' ? (
                        <Button size="sm" variant="secondary" disabled={generating === ag.id} onClick={() => handleGenerate(ag.id)} style={{whiteSpace:'nowrap'}}>
                          {generating === ag.id ? 'Generating…' : '📄 Generate e-Contract'}
                        </Button>
                      ) : (
                        <span className="data-table__muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  );
}
