import { useState } from 'react';
import { PageHeader, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import '../admin/admin.css';
import '../farmer/farmer.css';

const OUTCOME_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  satisfactory: 'success', concerns: 'warning', unsatisfactory: 'danger',
};

interface ReportForm {
  farm:                 string;
  visit_date:           string;
  outcome:              'satisfactory' | 'concerns' | 'unsatisfactory';
  flock_verified:       string;
  infrastructure_score: string;
  management_score:     string;
  biosecurity_score:    string;
  summary:              string;
}

const EMPTY_FORM: ReportForm = {
  farm: '', visit_date: new Date().toISOString().split('T')[0],
  outcome: 'satisfactory', flock_verified: '',
  infrastructure_score: '', management_score: '', biosecurity_score: '',
  summary: '',
};

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-field">
      <label>{label} <span style={{ color: 'var(--col-muted)', fontWeight: 400 }}>(0–10)</span></label>
      <input
        type="number" min="0" max="10" placeholder="e.g. 8"
        value={value} onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export default function SubmitReport() {
  const farms  = useAsync(() => farmsService.list(), []);
  const audits = useAsync(() => farmsService.listAudits(), []);

  const [form,    setForm]    = useState<ReportForm>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const allFarms  = toArray(farms.data);
  const allAudits = toArray(audits.data).slice(0, 10);

  const set = <K extends keyof ReportForm>(k: K, v: ReportForm[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const valid = form.farm && form.visit_date && form.flock_verified
    && form.infrastructure_score && form.management_score && form.biosecurity_score
    && form.summary;

  const score = (s: string) => Math.min(10, Math.max(0, parseInt(s) || 0));

  const handleSubmit = async () => {
    if (!valid) { setError('Please fill in all required fields.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await farmsService.createAudit({
        farm:                 form.farm,
        visit_date:           form.visit_date,
        outcome:              form.outcome,
        flock_verified:       parseInt(form.flock_verified) || 0,
        infrastructure_score: score(form.infrastructure_score),
        management_score:     score(form.management_score),
        biosecurity_score:    score(form.biosecurity_score),
        summary:              form.summary,
      });
      const farmName = allFarms.find(f => f.id === form.farm)?.name ?? 'farm';
      setSuccess(`Report for ${farmName} submitted successfully.`);
      setForm(EMPTY_FORM);
      audits.refetch();
    } catch {
      setError('Failed to submit report. Please check your inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Submit Field Report"
        subtitle="Log your farm visit findings directly into the system."
      />

      <div className="farmer-grid-main">
        {/* ── Form ──────────────────────────────────────────────────────── */}
        <div>
          <SectionTitle>New Audit Report</SectionTitle>
          <Card>
            {error   && <p className="form-error" style={{ marginBottom: 'var(--sp-md)' }}>{error}</p>}
            {success && <p className="form-success" style={{ marginBottom: 'var(--sp-md)' }}>{success}</p>}

            <div className="form-field">
              <label>Farm <span className="required">*</span></label>
              <select value={form.farm} onChange={e => set('farm', e.target.value)}>
                <option value="">— Select a farm —</option>
                {allFarms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.district}, {f.region}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Visit date <span className="required">*</span></label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.visit_date}
                  onChange={e => set('visit_date', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Outcome <span className="required">*</span></label>
                <select
                  value={form.outcome}
                  onChange={e => set('outcome', e.target.value as ReportForm['outcome'])}
                >
                  <option value="satisfactory">Satisfactory</option>
                  <option value="concerns">Concerns Noted</option>
                  <option value="unsatisfactory">Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Flock count verified on site <span className="required">*</span></label>
              <input
                type="number" min="0" placeholder="e.g. 1200"
                value={form.flock_verified}
                onChange={e => set('flock_verified', e.target.value)}
              />
            </div>

            {/* Scores */}
            <div style={{ background: 'var(--col-surface, #f8f7f4)', borderRadius: 8, padding: 'var(--sp-md)', marginBottom: 'var(--sp-md)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--sp-sm)', color: 'var(--col-text)' }}>
                Scores <span className="required">*</span>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <ScoreInput label="Infrastructure" value={form.infrastructure_score} onChange={v => set('infrastructure_score', v)} />
                <ScoreInput label="Management"     value={form.management_score}     onChange={v => set('management_score', v)} />
                <ScoreInput label="Biosecurity"    value={form.biosecurity_score}    onChange={v => set('biosecurity_score', v)} />
              </div>
            </div>

            <div className="form-field">
              <label>Summary / observations <span className="required">*</span></label>
              <textarea
                rows={5}
                placeholder="Describe what you observed during the visit — flock health, housing conditions, feeding practices, any concerns or recommendations…"
                value={form.summary}
                onChange={e => set('summary', e.target.value)}
              />
            </div>

            <Button
              disabled={!valid || saving}
              onClick={handleSubmit}
              style={{ width: '100%', marginTop: 'var(--sp-sm)' }}
            >
              {saving ? 'Submitting…' : 'Submit Report'}
            </Button>
          </Card>
        </div>

        {/* ── Recent reports ────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Recent Reports</SectionTitle>
          <Card>
            {audits.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : allAudits.length === 0 ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>
                No reports yet. Submit your first one above.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farm</th>
                    <th>Date</th>
                    <th>Outcome</th>
                    <th style={{ textAlign: 'center' }}>Infra</th>
                    <th style={{ textAlign: 'center' }}>Mgmt</th>
                    <th style={{ textAlign: 'center' }}>Bio</th>
                  </tr>
                </thead>
                <tbody>
                  {allAudits.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.farm_name ?? r.farm}</strong></td>
                      <td className="data-table__mono">
                        {new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                      </td>
                      <td>
                        <Badge variant={OUTCOME_BADGE[r.outcome]}>
                          {r.outcome.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>{r.infrastructure_score}/10</td>
                      <td style={{ textAlign: 'center' }}>{r.management_score}/10</td>
                      <td style={{ textAlign: 'center' }}>{r.biosecurity_score}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
