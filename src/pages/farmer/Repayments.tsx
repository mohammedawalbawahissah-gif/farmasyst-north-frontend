import { useState } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { paymentsService } from '../../lib/services/payments';
import { creditService } from '../../lib/services/credit';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RepaymentSchedule, CreditAgreement, DisbursementRequest } from '../../types';
import './farmer.css';

const SCHEDULE_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'info'> = {
  paid:     'success',
  overdue:  'danger',
  pending:  'warning',
  upcoming: 'neutral',
  due:      'warning',
  waived:   'neutral',
};

const AG_STATUS_BADGE: Record<string, 'success' | 'info' | 'danger' | 'neutral' | 'warning'> = {
  active:            'success',
  completed:         'info',
  defaulted:         'danger',
  cancelled:         'neutral',
  pending_signature: 'warning',
};

const PAYABLE = new Set(['upcoming', 'due', 'pending', 'overdue']);

type ModalMode = 'single' | 'full' | 'partial' | null;

export default function Repayments() {
  const schedules  = useAsync(() => paymentsService.listSchedules(), []);
  const agreements = useAsync(() => creditService.listAgreements(), []);
  const disbReqs   = useAsync(() => paymentsService.listDisbursementRequests(), []);

  const [modalMode,    setModalMode]    = useState<ModalMode>(null);
  const [payingId,     setPayingId]     = useState<string | null>(null);
  const [payingAgreId, setPayingAgreId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const [phone,   setPhone]   = useState('');
  const [method,  setMethod]  = useState<'momo' | 'paystack'>('momo');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Which agreement schedule-panels are expanded
  const [expandedAgs, setExpandedAgs] = useState<Set<string>>(new Set());

  const all     = toArray<RepaymentSchedule>(schedules.data);
  const pending = all.filter(s => PAYABLE.has(s.status));
  const overdue = all.filter(s => s.status === 'overdue');
  const paid    = all.filter(s => s.status === 'paid');
  const totalDue  = pending.reduce((s, r) => s + parseFloat(r.amount_due), 0);
  const totalPaid = paid.reduce((s, r) => s + parseFloat(r.amount_paid), 0);

  const ags    = toArray<CreditAgreement>(agreements.data);
  const drList = toArray<DisbursementRequest>(disbReqs.data);
  const drByAgreement = Object.fromEntries(drList.map(d => [d.agreement, d]));
  const activeAgs = ags.filter(a => a.status === 'active');

  const toggleAg = (id: string) =>
    setExpandedAgs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openSinglePay = (scheduleId: string) => {
    setPayingId(scheduleId); setModalMode('single');
    setCustomAmount(''); setError(''); setSuccess('');
  };

  const openPartialPay = (scheduleId: string) => {
    setPayingId(scheduleId); setModalMode('partial');
    setCustomAmount(''); setError(''); setSuccess('');
  };

  const openFullPay = (agreementId: string) => {
    setPayingAgreId(agreementId); setModalMode('full');
    setError(''); setSuccess('');
  };

  const closeModal = () => {
    setModalMode(null); setPayingId(null); setPayingAgreId(null); setCustomAmount('');
  };

  const handleSinglePay = async () => {
    if (!payingId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload: any = { schedule_id: payingId, method, phone_number: phone };
      if (modalMode === 'partial') {
        if (!customAmount || parseFloat(customAmount) <= 0) {
          setError('Please enter a valid amount.'); setLoading(false); return;
        }
        payload.amount = parseFloat(customAmount);
      }
      const res = await paymentsService.initiateRepayment(payload);
      if (method === 'paystack' && (res as any).authorization_url) {
        window.open((res as any).authorization_url, '_blank');
      } else {
        setSuccess('Payment initiated via MoMo. You will receive a prompt on your phone.');
      }
      closeModal(); schedules.refetch();
    } catch {
      setError('Payment initiation failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleFullPay = async () => {
    if (!payingAgreId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await paymentsService.payFullBalance({ agreement_id: payingAgreId, method, phone_number: phone });
      if (method === 'paystack' && res.authorization_url) {
        window.open(res.authorization_url, '_blank');
      } else {
        setSuccess(`Full balance payment of GHS ${parseFloat(res.total_amount).toLocaleString()} initiated via MoMo.`);
      }
      closeModal(); schedules.refetch();
    } catch {
      setError('Full balance payment failed. Please try again.');
    } finally { setLoading(false); }
  };

  const unpaidCountForAg = (id: string) => all.filter(s => s.agreement === id && PAYABLE.has(s.status)).length;
  const totalRemainingForAg = (id: string) =>
    all.filter(s => s.agreement === id && PAYABLE.has(s.status)).reduce((sum, s) => sum + parseFloat(s.amount_due), 0);

  const schedulesForAg = (id: string) => all.filter(s => s.agreement === id);

  // Amount due for the currently selected schedule
  const selectedScheduleAmount = payingId ? parseFloat(all.find(s => s.id === payingId)?.amount_due ?? '0') : 0;

  return (
    <div>
      <PageHeader title="Repayments" subtitle="Track disbursements, view your repayment schedule, and make payments." />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Total Instalments" value={all.length}      sub="All schedules"                        accent="#1A4A6B" />
        <StatCard label="Upcoming / Due"    value={pending.length}  sub={`GHS ${totalDue.toLocaleString()}`}   accent="#E8A020" />
        <StatCard label="Overdue"           value={overdue.length}  sub="Needs immediate attention"            accent="#C0392B" />
        <StatCard label="Paid"              value={paid.length}     sub={`GHS ${totalPaid.toLocaleString()} repaid`} accent="#4A7C2F" />
      </div>

      {error   && <p className="form-error"   style={{ marginBottom: 'var(--sp-md)' }}>{error}</p>}
      {success && <p className="form-success" style={{ marginBottom: 'var(--sp-md)' }}>{success}</p>}

      {/* ── Disbursement Status ───────────────────────────────────────────── */}
      {activeAgs.length > 0 && (
        <>
          <SectionTitle>Disbursement Status</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-xl)' }}>
            {activeAgs.map(ag => {
              const dr = drByAgreement[ag.id];
              return (
                <Card key={ag.id} style={{ borderLeft: `3px solid ${!dr ? 'var(--col-muted)' : dr.status === 'approved' ? 'var(--col-success)' : dr.status === 'rejected' ? 'var(--col-danger)' : 'var(--col-warning)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ag.reference} — {ag.credit_type}</div>
                      <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>
                        GHS {parseFloat(ag.amount).toLocaleString()} · {ag.repayment_period_months} months · {ag.interest_rate}% interest
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {!dr ? (
                        <Badge variant="neutral">Awaiting Disbursement Request</Badge>
                      ) : dr.status === 'pending' ? (
                        <Badge variant="warning">Disbursement Pending Admin Approval</Badge>
                      ) : dr.status === 'approved' ? (
                        <Badge variant="success">✓ Disbursement Approved</Badge>
                      ) : (
                        <Badge variant="danger">Disbursement Rejected</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {modalMode && (
        <Card style={{ maxWidth: 480, marginBottom: 'var(--sp-lg)', border: '1px solid var(--col-border)' }}>
          {modalMode === 'partial' ? (
            <>
              <h3 style={{ marginBottom: 4 }}>Pay Custom Amount</h3>
              <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>
                Enter any amount you'd like to pay toward this instalment
                {selectedScheduleAmount > 0 && ` (full amount: GHS ${selectedScheduleAmount.toLocaleString()})`}.
              </p>
              <div className="form-field">
                <label>Amount (GHS) <span className="required">*</span></label>
                <input
                  type="number" min="1" step="0.01"
                  placeholder="e.g. 200"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                />
              </div>
            </>
          ) : modalMode === 'single' ? (
            <>
              <h3 style={{ marginBottom: 4 }}>Pay Full Instalment</h3>
              <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>
                Pay the full amount due for this instalment (GHS {selectedScheduleAmount.toLocaleString()}).
              </p>
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: 4 }}>Pay Full Balance</h3>
              <div style={{ background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 6, padding: '10px 14px', marginBottom: 'var(--sp-md)', fontSize: 13, color: '#7c5800' }}>
                ⚠️ <strong>This action is irreversible.</strong> Confirms payment for{' '}
                <strong>all {unpaidCountForAg(payingAgreId!)} remaining instalment(s)</strong> totalling{' '}
                <strong>GHS {totalRemainingForAg(payingAgreId!).toLocaleString()}</strong>.
              </div>
            </>
          )}

          <div className="form-field">
            <label>Payment method</label>
            <select value={method} onChange={e => setMethod(e.target.value as 'momo' | 'paystack')}>
              <option value="momo">MTN Mobile Money</option>
              <option value="paystack">Card / Bank (Paystack)</option>
            </select>
          </div>
          {method === 'momo' && (
            <div className="form-field">
              <label>MoMo phone number</label>
              <input type="tel" placeholder="024XXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 'var(--sp-md)' }}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              disabled={loading || (method === 'momo' && !phone) || (modalMode === 'partial' && !customAmount)}
              onClick={modalMode === 'full' ? handleFullPay : handleSinglePay}
            >
              {loading ? 'Processing…' : modalMode === 'full' ? 'Confirm Full Payment' : 'Confirm Payment'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Credit Agreements + Collapsible Schedules ─────────────────────── */}
      <SectionTitle>Credit Agreements & Repayment Schedules</SectionTitle>
      {agreements.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading…</p>
      ) : ags.length === 0 ? (
        <Card><p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No credit agreements yet.</p></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)', marginBottom: 'var(--sp-xl)' }}>
          {ags.map(ag => {
            const remaining = unpaidCountForAg(ag.id);
            const agSchedules = schedulesForAg(ag.id);
            const isOpen = expandedAgs.has(ag.id);

            return (
              <Card key={ag.id} style={{ padding: 0, overflow: 'hidden' }}>
                {/* Agreement header row */}
                <div
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--sp-md)', cursor: 'pointer', gap: 'var(--sp-sm)',
                    background: isOpen ? '#f8f6f2' : '#fff', flexWrap: 'wrap',
                  }}
                  onClick={() => toggleAg(ag.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{ag.reference}</span>
                      <span style={{ color: 'var(--col-muted)', fontSize: 13, marginLeft: 8 }}>{ag.credit_type}</span>
                    </div>
                    <Badge variant={AG_STATUS_BADGE[ag.status]}>{ag.status.replace('_', ' ')}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>GHS {parseFloat(ag.amount).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>{ag.repayment_period_months}mo</span>
                    {agSchedules.length > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                        {agSchedules.length} instalment{agSchedules.length !== 1 ? 's' : ''}
                        {remaining > 0 && <span style={{ color: 'var(--col-warning)', marginLeft: 6 }}>· {remaining} unpaid</span>}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
                    {ag.status === 'active' && remaining > 0 && (
                      <Button
                        size="sm" variant="secondary"
                        onClick={e => { e.stopPropagation(); openFullPay(ag.id); }}
                        title={`Pay all ${remaining} remaining instalments at once`}
                      >
                        Pay Full Balance
                      </Button>
                    )}
                    {isOpen ? <ChevronUp size={16} color="var(--col-muted)" /> : <ChevronDown size={16} color="var(--col-muted)" />}
                  </div>
                </div>

                {/* Collapsible schedule table */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--col-border)' }}>
                    {agSchedules.length === 0 ? (
                      <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)', fontSize: 13 }}>
                        No repayment schedule generated yet. Awaiting disbursement approval.
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Due Date</th>
                            <th>Amount Due</th>
                            <th>Amount Paid</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agSchedules.map(s => (
                            <tr key={s.id}>
                              <td className="data-table__mono">{s.installment_number}</td>
                              <td>{new Date(s.due_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                              <td><strong>GHS {parseFloat(s.amount_due).toLocaleString()}</strong></td>
                              <td style={{ color: 'var(--col-success)' }}>GHS {parseFloat(s.amount_paid).toLocaleString()}</td>
                              <td><Badge variant={SCHEDULE_BADGE[s.status] ?? 'neutral'}>{s.status}</Badge></td>
                              <td>
                                {PAYABLE.has(s.status) ? (
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <Button size="sm" onClick={() => openSinglePay(s.id)}>Pay</Button>
                                    <Button size="sm" variant="secondary" onClick={() => openPartialPay(s.id)}>Partial</Button>
                                  </div>
                                ) : (
                                  <span className="data-table__muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
