import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { toArray } from '../../lib/api';
import { FileCheck, Clock, CheckCircle, AlertCircle, Download, PenLine } from 'lucide-react';
import './farmer.css';

const AG_BADGE: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  pending_signature: 'warning',
  active:            'success',
  completed:         'info',
  defaulted:         'danger',
  cancelled:         'neutral',
};

export default function FarmerContracts() {
  const agreements = useAsync(() => creditService.listAgreements(), []);

  const [signing,    setSigning]    = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const handleSign = async (id: string) => {
    setSigning(id); setError(''); setSuccess('');
    try {
      await creditService.signAgreement(id);
      setSuccess('Contract signed successfully! Once your investor also signs, the agreement becomes active and disbursement can proceed.');
      agreements.refetch();
    } catch {
      setError('Signing failed. Please try again or contact FarmAsyst North support.');
    } finally {
      setSigning(null);
    }
  };

  const ags            = toArray(agreements.data);
  const needsMySign    = ags.filter(a => a.status === 'pending_signature' && !a.farmer_signed_at);
  const otherContracts = ags.filter(a => !(a.status === 'pending_signature' && !a.farmer_signed_at));

  return (
    <div>
      <PageHeader
        title="My Contracts"
        subtitle="Review, sign, and track your investment agreements with FarmAsyst North."
      />

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          marginBottom: 'var(--sp-lg)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          marginBottom: 'var(--sp-lg)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={14} /> {success}
        </div>
      )}

      {/* Action required banner */}
      {needsMySign.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)',
          padding: '12px 16px', marginBottom: 'var(--sp-xl)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
          <span style={{ color: '#92400e' }}>
            You have <strong>{needsMySign.length}</strong> contract{needsMySign.length > 1 ? 's' : ''} waiting for your signature.
            Review the agreement terms below and sign to proceed.
          </span>
        </div>
      )}

      {/* Contracts awaiting farmer signature */}
      {needsMySign.length > 0 && (
        <>
          <SectionTitle>Action Required — Sign Your Contract ({needsMySign.length})</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)', marginBottom: 'var(--sp-xl)' }}>
            {needsMySign.map(ag => (
              <Card key={ag.id} style={{ borderLeft: '4px solid var(--col-warning)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-md)', marginBottom: 'var(--sp-md)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 15 }}>{ag.reference}</strong>
                      <Badge variant="warning">Pending Your Signature</Badge>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>
                      Created {new Date(ag.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  {ag.contract_document && (
                    <a
                      href={ag.contract_document}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 13, color: 'var(--col-primary)', textDecoration: 'none',
                        padding: '6px 12px', border: '1px solid var(--col-primary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <Download size={13} /> Download Contract PDF
                    </a>
                  )}
                </div>

                {/* Contract terms summary */}
                <div style={{
                  background: 'var(--col-surface)', borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px', marginBottom: 'var(--sp-md)',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px 24px',
                  fontSize: 13,
                }}>
                  <div>
                    <div style={{ color: 'var(--col-muted)', marginBottom: 2 }}>Credit type</div>
                    <strong style={{ textTransform: 'capitalize' }}>{ag.credit_type}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--col-muted)', marginBottom: 2 }}>Amount</div>
                    <strong>GHS {parseFloat(ag.amount).toLocaleString()}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--col-muted)', marginBottom: 2 }}>Repayment period</div>
                    <strong>{ag.repayment_period_months} months</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--col-muted)', marginBottom: 2 }}>Interest rate</div>
                    <strong>{ag.interest_rate}%</strong>
                  </div>
                </div>

                {/* Signature status */}
                <div style={{ display: 'flex', gap: 'var(--sp-md)', marginBottom: 'var(--sp-md)', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ag.farmer_signed_at
                      ? <CheckCircle size={14} style={{ color: 'var(--col-success)' }} />
                      : <Clock size={14} style={{ color: 'var(--col-warning)' }} />}
                    <span>Your signature: <strong>{ag.farmer_signed_at ? 'Signed' : 'Pending'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ag.investor_signed_at
                      ? <CheckCircle size={14} style={{ color: 'var(--col-success)' }} />
                      : <Clock size={14} style={{ color: 'var(--col-muted)' }} />}
                    <span style={{ color: 'var(--col-muted)' }}>Investor: <strong>{ag.investor_signed_at ? 'Signed' : 'Pending'}</strong></span>
                  </div>
                </div>

                {/* No document yet */}
                {!ag.contract_document && (
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px', marginBottom: 'var(--sp-md)', fontSize: 13, color: '#92400e',
                  }}>
                    The investor or FarmAsyst North has not yet generated the contract document. You'll be notified when it's ready to sign.
                  </div>
                )}

                {/* Sign action */}
                {ag.contract_document && !ag.farmer_signed_at && (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>
                      By signing, you confirm you have read and agree to the terms of this investment agreement.
                      Both parties must sign before funds are disbursed.
                    </p>
                    <Button
                      disabled={signing === ag.id}
                      onClick={() => handleSign(ag.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <PenLine size={14} />
                      {signing === ag.id ? 'Signing…' : 'Sign Contract'}
                    </Button>
                  </div>
                )}

                {/* Already signed, waiting on investor */}
                {ag.farmer_signed_at && !ag.investor_signed_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--col-muted)' }}>
                    <Clock size={14} />
                    You've signed — waiting for the investor's signature to activate the agreement.
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* All other contracts */}
      <SectionTitle>All Contracts ({ags.length})</SectionTitle>
      {agreements.loading ? (
        <Card><p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p></Card>
      ) : ags.length === 0 ? (
        <Card>
          <div style={{ padding: 'var(--sp-xl)', textAlign: 'center' }}>
            <FileCheck size={32} style={{ color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }} />
            <p style={{ color: 'var(--col-muted)', margin: 0, fontSize: 14 }}>
              No contracts yet. Once your credit application is approved and matched to an investor,
              your contract will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Period</th>
                <th>Status</th>
                <th>Your Signature</th>
                <th>Created</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {ags.map(ag => (
                <tr key={ag.id}>
                  <td className="data-table__mono">{ag.reference}</td>
                  <td style={{ textTransform: 'capitalize' }}>{ag.credit_type}</td>
                  <td><strong>GHS {parseFloat(ag.amount).toLocaleString()}</strong></td>
                  <td>{ag.repayment_period_months}mo</td>
                  <td><Badge variant={AG_BADGE[ag.status] ?? 'neutral'}>{ag.status.replace('_', ' ')}</Badge></td>
                  <td>
                    {ag.farmer_signed_at
                      ? <span style={{ color: 'var(--col-success)', fontSize: 13 }}>✓ Signed</span>
                      : <span style={{ color: 'var(--col-warning)', fontSize: 13 }}>Pending</span>}
                  </td>
                  <td className="data-table__muted">{new Date(ag.created_at).toLocaleDateString('en-GH')}</td>
                  <td>
                    {ag.contract_document ? (
                      <a
                        href={ag.contract_document}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Download size={12} /> Download
                      </a>
                    ) : (
                      <span className="data-table__muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
