import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import { toArray } from '../../lib/api';
import type { Farm, FarmAuditReport } from '../../types';
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
  report_document:      File | null;
}

const EMPTY: ReportForm = {
  farm: '', visit_date: new Date().toISOString().split('T')[0],
  outcome: 'satisfactory', flock_verified: '',
  infrastructure_score: '', management_score: '', biosecurity_score: '',
  summary: '', report_document: null,
};

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = parseInt(value) || 0;
  const color = n >= 8 ? '#4A7C2F' : n >= 5 ? '#E8A020' : n > 0 ? '#C0392B' : 'var(--col-muted)';
  return (
    <div className="form-field">
      <label>{label} <span style={{ color: 'var(--col-muted)', fontWeight: 400 }}>(0–10)</span></label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
        <input type="number" min="0" max="10" placeholder="e.g. 8" value={value} onChange={e => onChange(e.target.value)} />
        {value && <span style={{ fontWeight: 700, color, fontSize: 16 }}>{n}/10</span>}
      </div>
    </div>
  );
}

export default function SubmitReport() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const farms          = useAsync(() => farmsService.list(), []);
  const audits         = useAsync(() => farmsService.listAudits(), []);

  const [form,    setForm]    = useState<ReportForm>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const farmId = searchParams.get('farm');
    if (farmId) setForm(f => ({ ...f, farm: farmId }));
  }, [searchParams]);

  const allFarms  = toArray<Farm>(farms.data);
  const allAudits = toArray<FarmAuditReport>(audits.data).sort(
    (a: FarmAuditReport, b: FarmAuditReport) =>
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
  ).slice(0, 10);

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
      const fd = new FormData();
      fd.append('farm',                 form.farm);
      fd.append('visit_date',           form.visit_date);
      fd.append('outcome',              form.outcome);
      fd.append('flock_verified',       String(parseInt(form.flock_verified) || 0));
      fd.append('infrastructure_score', String(score(form.infrastructure_score)));
      fd.append('management_score',     String(score(form.management_score)));
      fd.append('biosecurity_score',    String(score(form.biosecurity_score)));
      fd.append('summary',              form.summary);
      if (form.report_document) fd.append('report_document', form.report_document);

      await farmsService.createAudit(fd as never);
      const farmName = allFarms.find((f: Farm) => f.id === form.farm)?.name ?? 'farm';
      setSuccess(`Report for ${farmName} submitted successfully.`);
      setForm(EMPTY);
      audits.refetch();
    } catch {
      setError('Failed to submit report. Please check your inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFarm = allFarms.find((f: Farm) => f.id === form.farm);

  return (
    <div>
      <PageHeader
        title="Submit Field Report"
        subtitle="Log your farm visit findings directly into the system."
      />

      <div className="farmer-grid-main">
        {/* ── Form ────────────────────────────────────────────────────────── */}
        <div>
          <SectionTitle>New Audit Report</SectionTitle>
          <Card>
            {error   && <p className="form-error"   style={{ marginBottom: 'var(--sp-md)' }}>{error}</p>}
            {success && <p className="form-success" style={{ marginBottom: 'var(--sp-md)' }}>{success}</p>}

            <div className="form-field">
              <label>Farm <span className="required">*</span></label>
              <select value={form.farm} onChange={e => set('farm', e.target.value)}>
                <option value="">— Select a farm —</option>
                {allFarms.map((f: Farm) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.district}, {f.region}</option>
                ))}
              </select>
            </div>

            {selectedFarm && (
              <div style={{ background: '#f0f7f0', border: '1px solid #c8e6c9', borderRadius: 8, padding: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', fontSize: 13, display: 'flex', gap: 'var(--sp-lg)', flexWrap: 'wrap' }}>
                <span>🐔 {selectedFarm.flock_type?.replace(/_/g, ' ')} · <strong>{selectedFarm.flock_size?.toLocaleString()} birds</strong></span>
                <span>📍 {selectedFarm.district}, {selectedFarm.region}</span>
                <span style={{ marginLeft: 'auto' }}>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/monitoring_officer/farms`)}>View Farm History</Button>
                </span>
              </div>
            )}

            <div className="form-row">
              <div className="form-field">
                <label>Visit date <span className="required">*</span></label>
                <input type="date" max={new Date().toISOString().split('T')[0]} value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Overall outcome <span className="required">*</span></label>
                <select value={form.outcome} onChange={e => set('outcome', e.target.value as ReportForm['outcome'])}>
                  <option value="satisfactory">✅ Satisfactory</option>
                  <option value="concerns">⚠️ Concerns Noted</option>
                  <option value="unsatisfactory">❌ Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Flock count verified on site <span className="required">*</span></label>
              <input type="number" min="0" placeholder="e.g. 1200" value={form.flock_verified} onChange={e => set('flock_verified', e.target.value)} />
              {selectedFarm && form.flock_verified && (
                <span style={{ fontSize: 12, color: Math.abs(parseInt(form.flock_verified) - selectedFarm.flock_size) > selectedFarm.flock_size * 0.1 ? '#C0392B' : '#4A7C2F' }}>
                  {Math.abs(parseInt(form.flock_verified) - selectedFarm.flock_size) > selectedFarm.flock_size * 0.1
                    ? `⚠️ Variance from registered count (${selectedFarm.flock_size?.toLocaleString()})`
                    : `✓ Within 10% of registered count (${selectedFarm.flock_size?.toLocaleString()})`}
                </span>
              )}
            </div>

            <div style={{ background: '#f8f7f4', borderRadius: 8, padding: 'var(--sp-md)', marginBottom: 'var(--sp-md)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--sp-sm)' }}>
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
                placeholder="Describe what you observed — flock health, housing conditions, feeding practices, water access, any concerns or recommendations…"
                value={form.summary}
                onChange={e => set('summary', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Attach report document (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => set('report_document', e.target.files?.[0] ?? null)}
                style={{ padding: '6px 0' }}
              />
              {form.report_document && (
                <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>📎 {form.report_document.name}</span>
              )}
            </div>

            <Button disabled={!valid || saving} onClick={handleSubmit} style={{ width: '100%', marginTop: 'var(--sp-sm)' }}>
              {saving ? 'Submitting…' : 'Submit Report'}
            </Button>
          </Card>
        </div>

        {/* ── Recent reports ───────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Recent Reports</SectionTitle>
          <Card>
            {audits.loading ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
            ) : allAudits.length === 0 ? (
              <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No reports yet. Submit your first one.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Farm</th><th>Date</th><th>Outcome</th><th>Infra</th><th>Mgmt</th><th>Bio</th></tr>
                </thead>
                <tbody>
                  {allAudits.map((r: FarmAuditReport) => (
                    <tr key={r.id}>
                      <td><strong>{r.farm}</strong></td>
                      <td className="data-table__mono" style={{ fontSize: 12 }}>
                        {new Date(r.visit_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td><Badge variant={OUTCOME_BADGE[r.outcome]}>{r.outcome.replace('_', ' ')}</Badge></td>
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
