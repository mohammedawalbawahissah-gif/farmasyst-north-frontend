import { useState, useEffect, useRef, useCallback } from 'react';
import type { Farm, FarmAuditReport } from '../../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import { api } from '../../lib/api';
import { toArray } from '../../lib/api';
import { Camera, RefreshCw, X, CheckCircle, AlertTriangle } from 'lucide-react';
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

// ── AI Flock Vision Counter ──────────────────────────────────────────────────
interface FlockVisionResult {
  count:      number;
  confidence: 'high' | 'medium' | 'low';
  notes:      string;
}

function AIFlockCounter({ onCountAccepted }: { onCountAccepted: (count: number) => void }) {
  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);

  const [mode,       setMode]       = useState<'idle' | 'camera' | 'upload' | 'analysing' | 'result' | 'error'>('idle');
  const [result,     setResult]     = useState<FlockVisionResult | null>(null);
  const [errMsg,     setErrMsg]     = useState('');
  const [capturedImg, setCapturedImg] = useState<string | null>(null);   // base64 data URL
  const [videoReady,  setVideoReady] = useState(false);

  // ── Attach stream to video element after it mounts ───────────────────────
  // setMode('camera') triggers a re-render that mounts <video>. We use an
  // effect so srcObject is assigned after the DOM element exists.
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      setVideoReady(false);
      const onCanPlay = () => {
        video.play().catch(() => {});
        setVideoReady(true);
      };
      video.addEventListener('canplay', onCanPlay);
      return () => video.removeEventListener('canplay', onCanPlay);
    }
  }, [mode]);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = async () => {
    setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setMode('camera'); // triggers re-render → <video> mounts → useEffect assigns srcObject
    } catch {
      setErrMsg('Camera access denied or unavailable. Please use the upload option instead.');
      setMode('error');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const captureFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoReady) return;
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImg(dataUrl);
    stopCamera();
    analyseImage(dataUrl);
  };

  // ── Upload helper ─────────────────────────────────────────────────────────
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) { setErrMsg('Please select an image file.'); setMode('error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setCapturedImg(dataUrl);
      analyseImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── AI Vision call ────────────────────────────────────────────────────────
  const analyseImage = async (dataUrl: string) => {
    setMode('analysing');
    setResult(null);

    // Strip the "data:image/jpeg;base64," prefix — backend needs raw base64
    const base64Image = dataUrl.split(',')[1];
    const mediaType   = (dataUrl.match(/^data:(image\/\w+);base64,/) ?? [])[1] ?? 'image/jpeg';

    try {
      const response = await api.post<FlockVisionResult>('/ai/flock-count/', {
        base64_image: base64Image,
        media_type:   mediaType,
      });
      setResult(response.data);
      setMode('result');
    } catch {
      setErrMsg('AI analysis failed. Please retake the photo or try again.');
      setMode('error');
    }
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera]);

  const reset = () => {
    stopCamera();
    setCapturedImg(null);
    setResult(null);
    setErrMsg('');
    setVideoReady(false);
    setMode('idle');
  };

  const confidenceColor = (c: FlockVisionResult['confidence']) =>
    c === 'high' ? '#4A7C2F' : c === 'medium' ? '#E8A020' : '#C0392B';

  const confidenceIcon = (c: FlockVisionResult['confidence']) =>
    c === 'high' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1.5px dashed #7B5C1A55',
      borderRadius: 10,
      padding: 'var(--sp-md)',
      background: '#fdf9f2',
      marginBottom: 'var(--sp-md)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-sm)' }}>
        <Camera size={16} color="#7B5C1A" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7B5C1A' }}>AI Live Flock Count</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
          background: '#7B5C1A22', color: '#7B5C1A', borderRadius: 4, padding: '2px 6px',
        }}>Beta</span>
        {mode !== 'idle' && (
          <button onClick={reset} title="Reset" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--col-muted)' }}>
            <X size={15} />
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--col-muted)', margin: '0 0 var(--sp-sm)', lineHeight: 1.5 }}>
        Point your camera at the flock or upload a photo — the AI will estimate the bird count automatically.
      </p>

      {/* ── Idle: action buttons ── */}
      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={startCamera}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#7B5C1A', color: '#fff', border: 'none',
              borderRadius: 7, padding: '7px 14px', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Camera size={13} /> Open Camera
          </button>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#7B5C1A22', color: '#7B5C1A',
            border: '1px solid #7B5C1A44',
            borderRadius: 7, padding: '7px 14px', fontSize: 12,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            📁 Upload Photo
            <input
              type="file" accept="image/*" hidden
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        </div>
      )}

      {/* ── Camera live feed ── */}
      {mode === 'camera' && (
        <div>
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', marginBottom: 10 }}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }}
            />
            {!videoReady && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff', fontSize: 13, gap: 8,
              }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Starting camera…
              </div>
            )}
            {/* Targeting overlay */}
            <div style={{
              position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.25)',
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 120, height: 120,
                border: '2px solid rgba(255,200,50,0.8)',
                borderRadius: 4,
              }} />
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={captureFrame}
              disabled={!videoReady}
              style={{
                flex: 1, background: videoReady ? '#7B5C1A' : '#bba97a', color: '#fff',
                border: 'none', borderRadius: 7, padding: '9px 0',
                fontSize: 13, fontWeight: 700,
                cursor: videoReady ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              📸 Capture &amp; Count
            </button>
            <button
              onClick={reset}
              style={{
                background: 'var(--col-chalk)', color: 'var(--col-muted)',
                border: '1px solid var(--col-border)',
                borderRadius: 7, padding: '9px 14px',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Analysing spinner ── */}
      {mode === 'analysing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--sp-lg) 0' }}>
          {capturedImg && (
            <img
              src={capturedImg} alt="Captured frame"
              style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, opacity: 0.6 }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7B5C1A', fontSize: 13, fontWeight: 600 }}>
            <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
            Analysing flock image…
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {mode === 'result' && result && (
        <div>
          {capturedImg && (
            <img
              src={capturedImg} alt="Analysed frame"
              style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
            />
          )}
          <div style={{
            background: '#fff', border: '1px solid #7B5C1A33',
            borderRadius: 8, padding: 'var(--sp-sm) var(--sp-md)',
            display: 'flex', flexDirection: 'column', gap: 6,
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#7B5C1A', lineHeight: 1 }}>
                {result.count.toLocaleString()}
              </span>
              <span style={{ fontSize: 13, color: 'var(--col-muted)' }}>birds counted</span>
              <span style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4,
                color: confidenceColor(result.confidence),
              }}>
                {confidenceIcon(result.confidence)} {result.confidence} confidence
              </span>
            </div>
            {result.notes && (
              <p style={{ fontSize: 12, color: 'var(--col-muted)', margin: 0, lineHeight: 1.5 }}>
                {result.notes}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onCountAccepted(result.count)}
              style={{
                flex: 1, background: '#7B5C1A', color: '#fff',
                border: 'none', borderRadius: 7, padding: '8px 0',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✓ Use this count
            </button>
            <button
              onClick={reset}
              style={{
                background: 'var(--col-chalk)', color: 'var(--col-muted)',
                border: '1px solid var(--col-border)',
                borderRadius: 7, padding: '8px 12px',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {mode === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, color: '#C0392B', margin: 0 }}>⚠️ {errMsg}</p>
          <button
            onClick={reset}
            style={{
              background: 'var(--col-chalk)', color: 'var(--col-muted)',
              border: '1px solid var(--col-border)',
              borderRadius: 7, padding: '7px 14px', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start',
            }}
          >
            Try again
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SubmitReport() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const farms          = useAsync(() => farmsService.list(), []);
  const audits         = useAsync(() => farmsService.listAudits(), []);

  const [form,    setForm]    = useState<ReportForm>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Pre-select farm if navigated from "Audit" button
  useEffect(() => {
    const farmId = searchParams.get('farm');
    if (farmId) setForm(f => ({ ...f, farm: farmId }));
  }, [searchParams]);

  const allFarms  = toArray<Farm>(farms.data);
  const allAudits = toArray<FarmAuditReport>(audits.data).sort(
    (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
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
      const farmName = allFarms.find(f => f.id === form.farm)?.name ?? 'farm';
      setSuccess(`Report for ${farmName} submitted successfully.`);
      setForm(EMPTY);
      audits.refetch();
    } catch {
      setError('Failed to submit report. Please check your inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFarm = allFarms.find(f => f.id === form.farm);

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
                {allFarms.map(f => (
                  <option key={f.id} value={f.id}>{f.name} — {f.district}, {f.region}</option>
                ))}
              </select>
            </div>

            {/* Farm quick-info if selected */}
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

            {/* ── Flock count field with AI camera helper ── */}
            <div className="form-field">
              <label>Flock count verified on site <span className="required">*</span></label>
              <input
                type="number" min="0" placeholder="e.g. 1200"
                value={form.flock_verified}
                onChange={e => set('flock_verified', e.target.value)}
              />
              {selectedFarm && form.flock_verified && (
                <span style={{ fontSize: 12, color: Math.abs(parseInt(form.flock_verified) - selectedFarm.flock_size) > selectedFarm.flock_size * 0.1 ? '#C0392B' : '#4A7C2F' }}>
                  {Math.abs(parseInt(form.flock_verified) - selectedFarm.flock_size) > selectedFarm.flock_size * 0.1
                    ? `⚠️ Variance from registered count (${selectedFarm.flock_size?.toLocaleString()})`
                    : `✓ Within 10% of registered count (${selectedFarm.flock_size?.toLocaleString()})`}
                </span>
              )}
            </div>

            {/* ── AI Flock Vision Counter ── */}
            <AIFlockCounter
              onCountAccepted={count => set('flock_verified', String(count))}
            />

            {/* Score inputs */}
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
                  {allAudits.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.farm_name ?? r.farm}</strong></td>
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
