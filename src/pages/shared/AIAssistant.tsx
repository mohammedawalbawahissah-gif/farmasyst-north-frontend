import { useState, useRef, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, SectionTitle } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { aiService, type CameraImage } from '../../lib/services/ai';
import { farmsService } from '../../lib/services/farms';
import { useAsync } from '../../lib/hooks/useAsync';
import { toArray } from '../../lib/api';
import type { Farm } from '../../types';
import {
  Bot, Send, AlertTriangle, TrendingUp, RefreshCw,
  Camera, Upload, X, Play, Pause, Image as ImageIcon,
  Video, CheckCircle, Trash2,
} from 'lucide-react';
import '../farmer/farmer.css';

type Tab = 'chat' | 'disease' | 'credit';
type DiseaseMode = 'logs' | 'camera' | 'upload';

const GRADE_COLORS: Record<string, string> = {
  A: '#16a34a', B: '#4A7C2F', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
};
const RISK_COLORS: Record<string, string> = {
  low: '#16a34a', moderate: '#ca8a04', high: '#ea580c', critical: '#dc2626',
};

// ── Camera capture hook ────────────────────────────────────────────────────
function useCameraCapture() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const [active, setActive]     = useState(false);
  const [error, setError]       = useState('');
  const [captured, setCaptured] = useState<CameraImage[]>([]);

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActive(true);
    } catch (e: any) {
      setError(e.message ?? 'Camera not accessible.');
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  };

  const snap = () => {
    if (!videoRef.current || !active) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(prev => [...prev, { data, mime_type: 'image/jpeg' }]);
  };

  const remove = (idx: number) =>
    setCaptured(prev => prev.filter((_, i) => i !== idx));

  const reset = () => setCaptured([]);

  // cleanup on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  return { videoRef, active, error, captured, start, stop, snap, remove, reset };
}

export default function AIAssistant() {
  const { user } = useAuth();
  const role = user?.role ?? 'farmer';

  const showCreditTab  = ['admin', 'farmer'].includes(role);
  const showDiseaseTab = ['admin', 'farmer', 'monitoring_officer', 'vet'].includes(role);

  const [tab, setTab] = useState<Tab>('chat');

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [sessionId,  setSessionId]  = useState<string | undefined>();
  const [messages,   setMessages]   = useState<{ role: string; content: string }[]>([]);
  const [chatInput,  setChatInput]  = useState('');
  const [chatBusy,   setChatBusy]   = useState(false);
  const [chatError,  setChatError]  = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatBusy) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatBusy(true);
    setChatError('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    try {
      const res = await aiService.chat(userMsg, sessionId);
      setSessionId(res.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setChatError('Assistant unavailable. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I could not respond. Please try again.' }]);
    } finally {
      setChatBusy(false);
    }
  };

  // ── Disease Detection ─────────────────────────────────────────────────────
  const farms    = useAsync(() => farmsService.list(), []);
  const farmList = toArray<Farm>(farms.data);
  const [selectedFarm,  setSelectedFarm]  = useState('');
  const [diseaseResult, setDiseaseResult] = useState<any>(null);
  const [diseaseBusy,   setDiseaseBusy]   = useState(false);
  const [diseaseError,  setDiseaseError]  = useState('');
  const [diseaseMode,   setDiseaseMode]   = useState<DiseaseMode>('logs');

  // Upload mode state
  const [uploadFiles,    setUploadFiles]    = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera mode state
  const cam = useCameraCapture();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const url = URL.createObjectURL(f);
      setUploadPreviews(prev => [...prev, url]);
    });
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeUploadFile = (idx: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx));
    setUploadPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearUploadFiles = () => {
    uploadPreviews.forEach(u => URL.revokeObjectURL(u));
    setUploadFiles([]);
    setUploadPreviews([]);
  };

  const runDiseaseDetection = async () => {
    const farmId = selectedFarm || farmList[0]?.id;
    if (!farmId) return;
    setDiseaseBusy(true);
    setDiseaseError('');
    setDiseaseResult(null);

    try {
      let res;
      if (diseaseMode === 'upload' && uploadFiles.length > 0) {
        res = await aiService.detectDiseaseWithFiles(farmId, uploadFiles);
      } else if (diseaseMode === 'camera' && cam.captured.length > 0) {
        res = await aiService.detectDiseaseWithCamera(farmId, cam.captured);
      } else {
        res = await aiService.detectDisease(farmId);
      }
      setDiseaseResult(res);
    } catch (err: any) {
      setDiseaseError(err?.response?.data?.detail ?? 'Disease analysis failed.');
    } finally {
      setDiseaseBusy(false);
    }
  };

  const canRunDisease = () => {
    const farmId = selectedFarm || farmList[0]?.id;
    if (!farmId && farmList.length === 0) return !!selectedFarm;
    if (diseaseMode === 'upload')  return uploadFiles.length > 0;
    if (diseaseMode === 'camera')  return cam.captured.length > 0;
    return true;
  };

  // ── Credit Scoring ────────────────────────────────────────────────────────
  const [creditFarmerId, setCreditFarmerId] = useState(user?.id ?? '');
  const [creditResult,   setCreditResult]   = useState<any>(null);
  const [creditBusy,     setCreditBusy]     = useState(false);
  const [creditError,    setCreditError]    = useState('');

  const runCreditScore = async () => {
    if (!creditFarmerId) return;
    setCreditBusy(true); setCreditError(''); setCreditResult(null);
    try {
      const res = await aiService.scoreCreditworthiness(creditFarmerId);
      setCreditResult(res);
    } catch (err: any) {
      setCreditError(err?.response?.data?.detail ?? 'Credit scoring failed.');
    } finally {
      setCreditBusy(false);
    }
  };

  const roleLabels: Record<string, string> = {
    farmer:            'Poultry Farmer Assistant',
    investor:          'Investment AI Assistant',
    admin:             'Admin AI Assistant',
    monitoring_officer:'Field Officer Assistant',
    vet:               'Veterinary AI Assistant',
    consumer:          'Buyer Assistant',
    input_dealer:      'Input Dealer Assistant',
  };

  const tabs: Tab[] = (
    (['chat'] as Tab[])
      .concat(showDiseaseTab ? ['disease'] : [])
      .concat(showCreditTab  ? ['credit']  : [])
  );

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        subtitle={roleLabels[role] ?? 'FarmAsyst North AI'}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: tab === t ? 'var(--col-primary)' : 'var(--col-surface)',
              color: tab === t ? '#fff' : 'var(--col-text)',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            {t === 'chat' ? '💬 AI Chat' : t === 'disease' ? '🦠 Disease Detection' : '📊 Credit Scoring'}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {tab === 'chat' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 360, maxHeight: 480, overflowY: 'auto', padding: 'var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--col-muted)' }}>
                <Bot size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 14 }}>
                  Ask me anything about your{' '}
                  {role === 'farmer'   ? 'farm, flock health, credit, or training' :
                   role === 'investor' ? 'portfolio, farmer profiles, or impact data' :
                   role === 'vet'      ? 'bookings, poultry diseases, or treatment protocols' :
                   'platform features and data'}.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%', padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'var(--col-primary)' : 'var(--col-surface-raised, #f5f5f5)',
                  color: m.role === 'user' ? '#fff' : 'var(--col-text)',
                  fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--col-surface-raised, #f5f5f5)', fontSize: 13, color: 'var(--col-muted)' }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ borderTop: '1px solid var(--col-border)', padding: 'var(--sp-sm) var(--sp-md)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {chatError && <p style={{ color: 'var(--col-danger)', fontSize: 12, margin: 0 }}>{chatError}</p>}
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="Type your question… (Enter to send)"
              rows={2}
              disabled={chatBusy}
              style={{ flex: 1, resize: 'none', border: '1px solid var(--col-border)', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit' }}
            />
            <Button onClick={sendChat} disabled={!chatInput.trim() || chatBusy} style={{ padding: '10px 16px', minWidth: 48 }}>
              <Send size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── DISEASE DETECTION TAB ── */}
      {tab === 'disease' && showDiseaseTab && (
        <div>
          <Card>
            <SectionTitle>Farm Disease Risk Analysis</SectionTitle>
            <p style={{ fontSize: 14, color: 'var(--col-muted)', margin: '0 0 var(--sp-md)' }}>
              Combine activity log data with real-time camera photos or offline media for richer AI analysis.
            </p>

            {/* Farm selector */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--sp-md)' }}>
              {farmList.length > 1 && (
                <div className="form-field" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                  <label>Select Farm</label>
                  <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
                    {farmList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              {farmList.length === 0 && (
                <div className="form-field" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                  <label>Farm ID</label>
                  <input type="text" placeholder="Enter farm UUID" value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} />
                </div>
              )}
            </div>

            {/* Mode selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
              {([
                { id: 'logs'  as DiseaseMode, icon: <Bot size={14} />,       label: 'Logs Only'       },
                { id: 'camera' as DiseaseMode, icon: <Camera size={14} />,   label: 'Camera Capture'  },
                { id: 'upload' as DiseaseMode, icon: <Upload size={14} />,   label: 'Upload Media'    },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => { setDiseaseMode(m.id); cam.stop(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: '1px solid var(--col-border)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: diseaseMode === m.id ? 'var(--col-primary)' : 'var(--col-surface)',
                    color: diseaseMode === m.id ? '#fff' : 'var(--col-text)',
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* ── Camera mode UI ─────────────────────────────────────── */}
            {diseaseMode === 'camera' && (
              <div style={{ marginBottom: 'var(--sp-md)' }}>
                <div style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                  <video
                    ref={cam.videoRef}
                    muted
                    playsInline
                    style={{ width: '100%', maxHeight: 260, display: cam.active ? 'block' : 'none', objectFit: 'cover' }}
                  />
                  {!cam.active && (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                      <div style={{ textAlign: 'center' }}>
                        <Camera size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                        <div style={{ opacity: 0.7 }}>Camera preview</div>
                      </div>
                    </div>
                  )}
                </div>
                {cam.error && <p style={{ color: 'var(--col-danger)', fontSize: 13, margin: '0 0 8px' }}>{cam.error}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!cam.active
                    ? <Button onClick={cam.start} style={{ gap: 6 }}><Camera size={14} /> Start Camera</Button>
                    : <>
                        <Button onClick={cam.snap} style={{ gap: 6, background: 'var(--col-primary)' }}><Camera size={14} /> Capture Photo</Button>
                        <Button onClick={cam.stop} style={{ gap: 6, background: '#64748b' }}><Pause size={14} /> Stop Camera</Button>
                      </>
                  }
                  {cam.captured.length > 0 && (
                    <Button onClick={cam.reset} style={{ gap: 6, background: '#ef4444' }}>
                      <Trash2 size={14} /> Clear ({cam.captured.length})
                    </Button>
                  )}
                </div>

                {/* Captured thumbnails */}
                {cam.captured.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {cam.captured.map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img
                          src={img.data}
                          alt={`capture-${i}`}
                          style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--col-primary)' }}
                        />
                        <button
                          onClick={() => cam.remove(i)}
                          style={{
                            position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                            borderRadius: '50%', background: '#ef4444', border: 'none',
                            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <X size={10} />
                        </button>
                        {i === 0 && (
                          <div style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, padding: '1px 4px', borderRadius: 4 }}>
                            ✓ Latest
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {cam.captured.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 6 }}>
                    {cam.captured.length} photo{cam.captured.length > 1 ? 's' : ''} captured — these will be included in the AI analysis alongside your activity logs.
                  </p>
                )}
              </div>
            )}

            {/* ── Upload mode UI ─────────────────────────────────────── */}
            {diseaseMode === 'upload' && (
              <div style={{ marginBottom: 'var(--sp-md)' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--col-border)', borderRadius: 10,
                    padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
                    color: 'var(--col-muted)', fontSize: 14, marginBottom: 10,
                    transition: 'border-color 0.15s',
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    setUploadFiles(prev => [...prev, ...files]);
                    files.forEach(f => setUploadPreviews(prev => [...prev, URL.createObjectURL(f)]));
                  }}
                >
                  <Upload size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to upload or drag & drop</div>
                  <div style={{ fontSize: 12 }}>Images (JPG, PNG, WEBP) and Videos (MP4, MOV, AVI)</div>
                </div>

                {uploadFiles.length > 0 && (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {uploadFiles.map((f, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          {f.type.startsWith('video/') ? (
                            <div style={{
                              width: 72, height: 72, borderRadius: 8, background: '#1e293b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: '2px solid var(--col-primary)',
                            }}>
                              <Video size={24} color="#94a3b8" />
                            </div>
                          ) : (
                            <img
                              src={uploadPreviews[i]}
                              alt={f.name}
                              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--col-primary)' }}
                            />
                          )}
                          <button
                            onClick={() => removeUploadFile(i)}
                            style={{
                              position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                              borderRadius: '50%', background: '#ef4444', border: 'none',
                              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <X size={10} />
                          </button>
                          <div style={{ fontSize: 10, color: 'var(--col-muted)', marginTop: 2, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Button onClick={() => fileInputRef.current?.click()} style={{ gap: 6, fontSize: 12 }}>
                        <ImageIcon size={13} /> Add More
                      </Button>
                      <Button onClick={clearUploadFiles} style={{ gap: 6, fontSize: 12, background: '#64748b' }}>
                        <Trash2 size={13} /> Clear All
                      </Button>
                      <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                        {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Run button */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                onClick={runDiseaseDetection}
                disabled={diseaseBusy || !canRunDisease()}
              >
                {diseaseBusy
                  ? <><RefreshCw size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Analysing…</>
                  : `🦠 Run Analysis${diseaseMode !== 'logs' ? ' with Media' : ''}`
                }
              </Button>
              {diseaseMode !== 'logs' && (
                <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                  {diseaseMode === 'camera'
                    ? `${cam.captured.length} photo${cam.captured.length !== 1 ? 's' : ''} + activity logs`
                    : `${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''} + activity logs`
                  }
                </span>
              )}
            </div>
            {diseaseError && <p style={{ color: 'var(--col-danger)', marginTop: 12, fontSize: 14 }}>{diseaseError}</p>}
          </Card>

          {/* Disease result */}
          {diseaseResult && (
            <Card style={{ marginTop: 'var(--sp-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '8px 18px', borderRadius: 20, fontWeight: 700, fontSize: 13,
                  background: RISK_COLORS[diseaseResult.risk_level] + '20',
                  color: RISK_COLORS[diseaseResult.risk_level],
                  border: `1px solid ${RISK_COLORS[diseaseResult.risk_level]}40`,
                  textTransform: 'uppercase',
                }}>
                  {diseaseResult.risk_level} risk
                </div>
                <span style={{ fontSize: 13, color: 'var(--col-muted)' }}>
                  Risk score: <strong>{diseaseResult.risk_score}/100</strong>
                </span>
                {diseaseResult.has_media && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4A7C2F', fontWeight: 600 }}>
                    <CheckCircle size={13} /> Visual analysis included ({diseaseResult.media_count} image{diseaseResult.media_count !== 1 ? 's' : ''})
                  </div>
                )}
                {diseaseResult.vet_consultation_required && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ea580c', fontSize: 13, fontWeight: 600 }}>
                    <AlertTriangle size={14} /> Vet consultation required
                  </div>
                )}
              </div>

              <p style={{ fontSize: 14, marginBottom: 'var(--sp-md)', lineHeight: 1.6 }}>{diseaseResult.summary}</p>

              {diseaseResult.visual_findings && (
                <>
                  <SectionTitle>Visual Findings</SectionTitle>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 'var(--sp-md)', fontSize: 14, color: '#166534' }}>
                    {diseaseResult.visual_findings}
                  </div>
                </>
              )}

              {diseaseResult.detected_signals?.length > 0 && (
                <>
                  <SectionTitle>Detected Signals</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                    {diseaseResult.detected_signals.map((s: any, i: number) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <span style={{ color: RISK_COLORS[s.severity] ?? 'inherit', fontWeight: 600 }}>[{s.severity}]</span> {s.signal}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {diseaseResult.suspected_conditions?.length > 0 && (
                <>
                  <SectionTitle>Suspected Conditions</SectionTitle>
                  {diseaseResult.suspected_conditions.map((c: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--col-border)', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.condition} <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>({c.confidence} confidence)</span></div>
                      <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>{c.reason}</div>
                    </div>
                  ))}
                </>
              )}

              {diseaseResult.immediate_actions?.length > 0 && (
                <>
                  <SectionTitle>Immediate Actions</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                    {diseaseResult.immediate_actions.map((a: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
                  </ul>
                </>
              )}

              {diseaseResult.preventive_recommendations?.length > 0 && (
                <>
                  <SectionTitle>Preventive Recommendations</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14, color: 'var(--col-muted)' }}>
                    {diseaseResult.preventive_recommendations.map((r: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
                  </ul>
                </>
              )}

              <p style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 'var(--sp-md)', borderTop: '1px solid var(--col-border)', paddingTop: 8 }}>
                Generated: {new Date(diseaseResult.generated_at).toLocaleString()} — Farm: {diseaseResult.farm_name}
                {diseaseResult.has_media && ` · ${diseaseResult.media_count} visual input${diseaseResult.media_count !== 1 ? 's' : ''} analysed`}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── CREDIT SCORING TAB ── */}
      {tab === 'credit' && showCreditTab && (
        <div>
          <Card>
            <SectionTitle>AI Credit Scoring Engine</SectionTitle>
            <p style={{ fontSize: 14, color: 'var(--col-muted)', margin: '0 0 var(--sp-md)' }}>
              Analyse farmer KPIs, farm data, audit scores, and activity logs to generate a creditworthiness score.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {role === 'admin' && (
                <div className="form-field" style={{ flex: 1, minWidth: 260, margin: 0 }}>
                  <label>Farmer User ID (UUID)</label>
                  <input
                    type="text" placeholder="Paste farmer UUID"
                    value={creditFarmerId} onChange={e => setCreditFarmerId(e.target.value)}
                  />
                </div>
              )}
              <Button onClick={runCreditScore} disabled={creditBusy || !creditFarmerId}>
                {creditBusy ? <><RefreshCw size={14} style={{ marginRight: 6 }} />Scoring…</> : '📊 Run Credit Score'}
              </Button>
            </div>
            {creditError && <p style={{ color: 'var(--col-danger)', marginTop: 12, fontSize: 14 }}>{creditError}</p>}
          </Card>

          {creditResult && (
            <Card style={{ marginTop: 'var(--sp-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 26, fontWeight: 800,
                  background: (GRADE_COLORS[creditResult.grade] ?? '#666') + '18',
                  color: GRADE_COLORS[creditResult.grade] ?? '#666',
                  border: `3px solid ${GRADE_COLORS[creditResult.grade] ?? '#666'}`,
                }}>
                  {creditResult.grade}
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{creditResult.overall_score}<span style={{ fontSize: 14, color: 'var(--col-muted)', fontWeight: 400 }}>/100</span></div>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>{creditResult.farmer_name}</div>
                </div>
                <div style={{
                  marginLeft: 'auto', padding: '8px 18px', borderRadius: 20, fontWeight: 700, fontSize: 13,
                  background: creditResult.recommendation === 'approve' ? '#16a34a20' : creditResult.recommendation === 'review' ? '#ca8a0420' : '#dc262620',
                  color: creditResult.recommendation === 'approve' ? '#16a34a' : creditResult.recommendation === 'review' ? '#ca8a04' : '#dc2626',
                  textTransform: 'capitalize',
                }}>
                  <TrendingUp size={12} style={{ marginRight: 6 }} />{creditResult.recommendation}
                </div>
              </div>

              <SectionTitle>Score Breakdown</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 'var(--sp-md)' }}>
                {Object.entries(creditResult.dimensions).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ padding: '12px 14px', background: 'var(--col-surface-raised, #f8f8f8)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--col-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{val}<span style={{ fontSize: 12, color: 'var(--col-muted)' }}>/20</span></div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--col-border)', marginTop: 6 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: 'var(--col-primary)', width: `${(val / 20) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 'var(--sp-md)' }}>{creditResult.narrative}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
                <div>
                  <SectionTitle>Strengths</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                    {creditResult.strengths?.map((s: string, i: number) => <li key={i} style={{ marginBottom: 4, color: '#16a34a' }}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <SectionTitle>Risks</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                    {creditResult.risks?.map((r: string, i: number) => <li key={i} style={{ marginBottom: 4, color: '#ea580c' }}>{r}</li>)}
                  </ul>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 'var(--sp-md)', borderTop: '1px solid var(--col-border)', paddingTop: 8 }}>
                Generated: {new Date(creditResult.generated_at).toLocaleString()}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
