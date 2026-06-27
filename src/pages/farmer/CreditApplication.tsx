import { useState } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Button, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { creditService } from '../../lib/services/credit';
import { farmsService } from '../../lib/services/farms';
import type { Farm, CreditApplication as CreditApp } from '../../types';
import './farmer.css';

type Step = 1 | 2 | 3 | 4;

// ── Match admin credit types exactly ──────────────────────────────────────────
const CREDIT_TYPES: { value: string; label: string; icon: string; desc: string }[] = [
  { value: 'direct_financing',    icon: '💰', label: 'Direct Financing',    desc: 'Direct capital for startup, flock acquisition, or equipment' },
  { value: 'farm_inputs',         icon: '🌾', label: 'Farm Inputs',         desc: 'Feed, vaccines, medications, and housing materials in-kind' },
  { value: 'structured_training', icon: '📚', label: 'Structured Training', desc: 'Enrolment in a structured training programme — free' },
  { value: 'mixed',               icon: '🤝', label: 'Mixed',               desc: 'Combination of financing and in-kind support' },
];
const DOC_TYPES = [
  { value: 'ghana_card',    label: 'Ghana Card' },
  { value: 'farm_cert',     label: 'Farm Certificate' },
  { value: 'farm_photo',    label: 'Farm Photo' },
  { value: 'season_record', label: 'Season Record' },
  { value: 'other',         label: 'Other Document' },
];

export default function CreditApplication() {
  const farms = useAsync(() => farmsService.list(), []);
  const apps  = useAsync(() => creditService.listApps(), []);

  const [step, setStep]               = useState<Step>(1);
  const [creditType, setCreditType]   = useState<string>('');
  const [farmId, setFarmId]           = useState('');
  const [amount, setAmount]           = useState('');
  const [months, setMonths]           = useState('');
  const [purpose, setPurpose]         = useState('');
  const [inputDetails, setInputDetails] = useState('');
  const [docType, setDocType]         = useState('ghana_card');
  const [docFile, setDocFile]         = useState<File | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [draftId, setDraftId]         = useState('');
  const [submitted, setSubmitted]     = useState(false);

  const saveDraft = async () => {
    if (!creditType) return;
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        credit_type: creditType,
        purpose,
        ...(farmId && { farm: farmId }),
        ...(amount && { amount_requested: String(parseFloat(amount)) }),
        ...(months && { repayment_period_months: parseInt(months) }),
        ...(creditType === 'inputs' && { input_details: inputDetails }),
      };
      let app;
      if (draftId) {
        app = await creditService.updateApp(draftId, payload);
      } else {
        app = await creditService.createApp(payload as never);
        setDraftId(app.id);
      }
      return app;
    } catch {
      setError('Could not save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 2) { await saveDraft(); }
    setStep(s => (s + 1) as Step);
  };

  const handleUpload = async () => {
    if (!docFile || !draftId) return;
    setSaving(true); setError('');
    try {
      await creditService.uploadDoc(draftId, docFile, docType);
      setStep(4);
    } catch {
      setError('Document upload failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!draftId) return;
    setSaving(true); setError('');
    try {
      await creditService.submitApp(draftId);
      setSubmitted(true);
      apps.refetch();
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <PageHeader title="Credit Application" subtitle="Apply for funding, farm inputs, or training enrolment." />
        <Card style={{ maxWidth: 540, margin: '3rem auto', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Application Submitted!</h2>
          <p style={{ color: 'var(--col-muted)', marginBottom: '1.5rem' }}>
            Your application has been submitted and is now under review by the FarmAsyst North team.
            You'll be notified when your status changes.
          </p>
          <Button onClick={() => { setSubmitted(false); setStep(1); setCreditType(''); setDraftId(''); setAmount(''); setMonths(''); setPurpose(''); setDocFile(null); }}>
            New Application
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Credit Application" subtitle="Apply for funding, farm inputs, or training enrolment." />

      {/* Stepper */}
      <div className="stepper">
        {['Credit Type', 'Details', 'Documents', 'Review'].map((label, i) => (
          <div key={label} className={`stepper__step ${step === i + 1 ? 'stepper__step--active' : step > i + 1 ? 'stepper__step--done' : ''}`}>
            <div className="stepper__dot">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <Card style={{ maxWidth: 620, margin: '0 auto' }}>
        {error && <p className="form-error">{error}</p>}

        {/* Step 1 — Credit type */}
        {step === 1 && (
          <div className="app-step">
            <h3>What type of support are you applying for?</h3>
            <p style={{ color: 'var(--col-muted)', fontSize: 13, marginBottom: '1.25rem' }}>
              Select the credit type that best matches your needs.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}>
              {CREDIT_TYPES.map(t => {
                const selected = creditType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setCreditType(t.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '1rem 1.1rem',
                      borderRadius: 10,
                      border: selected
                        ? '2px solid var(--col-primary, #4A7C2F)'
                        : '1.5px solid var(--col-border, #ddd)',
                      background: selected
                        ? 'var(--col-primary-light, #f0f7eb)'
                        : 'var(--col-surface, #fff)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                      boxShadow: selected ? '0 0 0 3px rgba(74,124,47,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{t.icon}</span>
                    <strong style={{
                      fontSize: 14,
                      color: selected ? 'var(--col-primary, #4A7C2F)' : 'var(--col-text)',
                    }}>
                      {t.label}
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--col-muted)', lineHeight: 1.5 }}>
                      {t.desc}
                    </span>
                    {selected && (
                      <span style={{
                        marginTop: 2,
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                        color: 'var(--col-primary, #4A7C2F)',
                        background: 'rgba(74,124,47,0.10)',
                        borderRadius: 6, padding: '2px 8px',
                        textTransform: 'uppercase',
                      }}>
                        Selected ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="step-actions">
              <Button disabled={!creditType} onClick={() => setStep(2)}>Continue →</Button>
            </div>
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <div className="app-step">
            <h3>Application details</h3>

            {toArray<Farm>(farms.data).length > 0 && (
              <div className="form-field">
                <label>Select farm (optional)</label>
                <select value={farmId} onChange={e => setFarmId(e.target.value)}>
                  <option value="">— No specific farm —</option>
                  {toArray<Farm>(farms.data).map(f => (
                    <option key={f.id} value={f.id}>{f.name} · {f.district}</option>
                  ))}
                </select>
              </div>
            )}

            {creditType !== 'structured_training' && (
              <div className="form-row">
                <div className="form-field">
                  <label>Amount requested (GHS)</label>
                  <input type="number" min="1" placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Repayment period (months)</label>
                  <input type="number" min="1" max="36" placeholder="e.g. 12" value={months} onChange={e => setMonths(e.target.value)} />
                </div>
              </div>
            )}

            <div className="form-field">
              <label>Purpose <span className="required">*</span></label>
              <textarea
                rows={4}
                placeholder="Describe what you will use this support for and how it will benefit your farm..."
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
              />
            </div>

            {creditType === 'farm_inputs' && (
              <div className="form-field">
                <label>Input details</label>
                <textarea
                  rows={3}
                  placeholder="List the specific feeds, medications, or materials you need..."
                  value={inputDetails}
                  onChange={e => setInputDetails(e.target.value)}
                />
              </div>
            )}

            <div className="step-actions">
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button disabled={!purpose || saving} onClick={handleNext}>
                {saving ? 'Saving…' : 'Continue →'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Documents */}
        {step === 3 && (
          <div className="app-step">
            <h3>Upload supporting documents</h3>
            <p style={{ color: 'var(--col-muted)', marginBottom: '1.5rem', fontSize: 14 }}>
              Documents help verify your application and increase approval chances. You can skip this step and upload later.
            </p>

            <div className="form-field">
              <label>Document type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Select file (PDF, JPG, PNG — max 10MB)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="step-actions">
              <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="secondary" onClick={() => setStep(4)}>Skip for now</Button>
              <Button disabled={!docFile || saving} onClick={handleUpload}>
                {saving ? 'Uploading…' : 'Upload & Continue →'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Review & submit */}
        {step === 4 && (
          <div className="app-step">
            <h3>Review your application</h3>

            <div className="review-block">
              <div className="review-row"><span>Credit type</span><strong>{CREDIT_TYPES.find(t => t.value === creditType)?.label}</strong></div>
              {amount && <div className="review-row"><span>Amount requested</span><strong>GHS {parseFloat(amount).toLocaleString()}</strong></div>}
              {months && <div className="review-row"><span>Repayment period</span><strong>{months} months</strong></div>}
              <div className="review-row"><span>Application status</span><Badge variant="neutral">Draft — will be submitted</Badge></div>
            </div>

            <div className="review-purpose">
              <strong>Purpose</strong>
              <p>{purpose}</p>
            </div>

            <p style={{ fontSize: 13, color: 'var(--col-muted)', marginTop: '1rem' }}>
              By submitting, you confirm all provided information is accurate. FarmAsyst North will review your application and match you with a suitable investor.
            </p>

            <div className="step-actions">
              <Button variant="secondary" onClick={() => setStep(3)}>← Back</Button>
              <Button disabled={saving} onClick={handleSubmit}>
                {saving ? 'Submitting…' : 'Submit Application ✓'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Previous applications */}
      {toArray<CreditApp>(apps.data).length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Your Previous Applications</h3>
          <Card>
            <table className="data-table">
              <thead>
                <tr><th>Reference</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {toArray<CreditApp>(apps.data).slice(0, 8).map(app => (
                  <tr key={app.id}>
                    <td className="data-table__mono">{app.reference}</td>
                    <td>{app.credit_type}</td>
                    <td>{app.amount_requested ? `GHS ${parseFloat(app.amount_requested).toLocaleString()}` : 'Free'}</td>
                    <td><Badge variant={
                      ['approved','disbursed'].includes(app.status) ? 'success' :
                      app.status === 'rejected' ? 'danger' :
                      ['submitted','under_review','scored','matched'].includes(app.status) ? 'warning' : 'neutral'
                    }>{app.status.replace('_', ' ')}</Badge></td>
                    <td className="data-table__muted">{new Date(app.created_at).toLocaleDateString('en-GH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
