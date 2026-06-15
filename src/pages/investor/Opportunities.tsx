import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { adminService } from '../../lib/services/admin';
import { toArray } from '../../lib/api';
import { displayName, userId } from '../../types';
import { CheckCircle, XCircle, Users, TrendingUp, Clock } from 'lucide-react';
import type { CreditApplication, CreditAgreement } from '../../types';
import '../farmer/farmer.css';
import './investor.css';

export default function Opportunities() {
  const apps      = useAsync(() => creditService.listMatchedForInvestor(), []);
  const profiles  = useAsync(() => adminService.listFarmerProfiles(), []);
  const agreements = useAsync(() => creditService.listAgreements(), []);

  const [acting, setActing]   = useState<string | null>(null);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const allAgreements = toArray<CreditAgreement>(agreements.data);
  const agreementByApp = Object.fromEntries(
    allAgreements.map(ag => [typeof ag.application === 'string' ? ag.application : (ag.application as any)?.id, ag])
  );
  // Show matched apps AND approved apps that already have an agreement (accepted)
  const matched   = toArray<CreditApplication>(apps.data).filter(a => ['matched', 'approved'].includes(a.status));
  const profMap   = Object.fromEntries(toArray<any>(profiles.data).map(p => [userId(p.user), p]));

  const handle = async (action: 'accept' | 'decline', appId: string) => {
    setActing(appId); setMsg('');
    try {
      if (action === 'accept') {
        await creditService.acceptMatch(appId);
        setMsgType('success');
        setMsg('You have accepted this opportunity. A contract has been prepared — check Contracts.');
      } else {
        await creditService.declineMatchByInvestor(appId);
        setMsgType('success');
        setMsg('Opportunity declined. FarmAsyst North has been notified.');
      }
      apps.refetch();
      agreements.refetch();
    } catch {
      setMsgType('error');
      setMsg('Action failed. Please try again or contact support.');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Investment Opportunities"
        subtitle="Applications matched to your investment profile by FarmAsyst North. Review and accept or decline."
      />

      {msg && (
        <div style={{
          background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: msgType === 'success' ? '#166534' : '#b91c1c',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          marginBottom: 'var(--sp-lg)', fontSize: 13,
        }}>
          {msg}
        </div>
      )}

      {apps.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading matched opportunities…</p>
      ) : matched.length === 0 ? (
        <Card>
          <div style={{ padding: 'var(--sp-xl)', textAlign: 'center' }}>
            <Clock size={32} style={{ color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }} />
            <p style={{ color: 'var(--col-muted)', margin: 0, fontSize: 14 }}>
              No opportunities matched to you yet. FarmAsyst North will notify you when a farmer application matches your investment criteria.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <SectionTitle>Matched to You ({matched.length})</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
            {matched.map(app => {
              const farmerUserId = userId(app.farmer);
              const profile      = profMap[farmerUserId];

              return (
                <Card key={app.id} style={{ borderLeft: '4px solid var(--col-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-md)' }}>

                    {/* Left — application details */}
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{app.reference}</span>
                        <Badge variant="info">{app.credit_type}</Badge>
                        <Badge variant="warning">Matched</Badge>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13, marginBottom: 10 }}>
                        <div><span style={{ color: 'var(--col-muted)' }}>Farmer</span><br /><strong>{displayName(app.farmer)}</strong></div>
                        {app.amount_requested && (
                          <div><span style={{ color: 'var(--col-muted)' }}>Amount requested</span><br /><strong>GHS {parseFloat(app.amount_requested).toLocaleString()}</strong></div>
                        )}
                        {app.repayment_period_months && (
                          <div><span style={{ color: 'var(--col-muted)' }}>Repayment period</span><br /><strong>{app.repayment_period_months} months</strong></div>
                        )}
                        {app.credit_score_at_submission && (
                          <div><span style={{ color: 'var(--col-muted)' }}>Credit score</span><br /><strong>{app.credit_score_at_submission}</strong></div>
                        )}
                      </div>

                      {app.purpose && (
                        <p style={{ fontSize: 13, color: 'var(--col-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                          <em>Purpose:</em> {app.purpose}
                        </p>
                      )}
                    </div>

                    {/* Middle — farmer profile snapshot */}
                    {profile && (
                      <div style={{
                        background: 'var(--col-surface)', borderRadius: 'var(--radius-sm)',
                        padding: '12px 16px', minWidth: 200, fontSize: 13,
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={13} /> Farmer Profile
                        </div>
                        <div style={{ color: 'var(--col-muted)', lineHeight: 1.8 }}>
                          <div>{profile.district}, {profile.region}</div>
                          <div>{profile.years_of_farming} yr{profile.years_of_farming !== 1 ? 's' : ''} farming</div>
                          {profile.credit_score && <div>Credit score: <strong>{profile.credit_score}</strong></div>}
                          <div>
                            <Badge variant={profile.verification_status === 'verified' ? 'success' : 'warning'} >
                              {profile.verification_status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Right — actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xs)', alignItems: 'flex-end' }}>
                      {(() => {
                        const ag = agreementByApp[app.id];
                        if (ag) {
                          if (ag.status === 'pending_signature') {
                            return (
                              <>
                                <Badge variant="warning">Contract Pending Signature</Badge>
                                <a
                                  href="/investor/contracts"
                                  style={{ fontSize: 12, color: 'var(--col-primary)', marginTop: 4 }}
                                >
                                  View &amp; Sign Contract →
                                </a>
                                <span style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 2 }}>
                                  Investor: {ag.investor_signed_at ? '✓ Signed' : '✗ Pending'} &nbsp;·&nbsp;
                                  Farmer: {ag.farmer_signed_at ? '✓ Signed' : '✗ Pending'}
                                </span>
                              </>
                            );
                          }
                          if (ag.status === 'active') {
                            return (
                              <>
                                <Badge variant="success">Agreement Active</Badge>
                                <a href="/investor/contracts" style={{ fontSize: 12, color: 'var(--col-primary)', marginTop: 4 }}>
                                  View Agreement →
                                </a>
                              </>
                            );
                          }
                          if (ag.status === 'completed') {
                            return <Badge variant="info">Completed &amp; Disbursed</Badge>;
                          }
                        }
                        return (
                          <>
                            <Button
                              disabled={acting === app.id}
                              onClick={() => handle('accept', app.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140 }}
                            >
                              <CheckCircle size={14} />
                              {acting === app.id ? 'Processing…' : 'Accept & Proceed'}
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={acting === app.id}
                              onClick={() => handle('decline', app.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, color: 'var(--col-danger)' }}
                            >
                              <XCircle size={14} />
                              Decline
                            </Button>
                            <span style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 2 }}>
                              Matched {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GH') : ''}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Contextual tip */}
      <div style={{
        marginTop: 'var(--sp-xl)', background: 'var(--col-surface)', borderRadius: 'var(--radius-sm)',
        padding: 'var(--sp-md)', fontSize: 13, color: 'var(--col-muted)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <TrendingUp size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          Accepting an opportunity creates a formal contract for both parties to sign. You can review the
          full contract and farmer due diligence before signing in the <strong>Contracts</strong> section.
          Declining returns the application to FarmAsyst North for re-matching.
        </span>
      </div>
    </div>
  );
}
