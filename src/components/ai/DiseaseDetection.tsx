import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, RefreshCw, AlertTriangle, Video, Image as ImageIcon, CameraOff, Maximize2 } from 'lucide-react';
import { SectionTitle, Card, Button } from '../../components/ui';
import { aiService } from '../../lib/services/ai';
import type { DiseaseDetectionResult } from '../../lib/services/ai';
import type { Farm } from '../../types';

const RISK_COLORS: Record<string, string> = {
  low:      '#16a34a',
  moderate: '#ca8a04',
  high:     '#ea580c',
  critical: '#dc2626',
};

interface Props {
  farmList: Farm[];
  role: string;
}

type MediaMode = 'none' | 'camera' | 'upload';
type CaptureType = 'photo' | 'video';

export default function DiseaseDetection({ farmList, role }: Props) {
  const [selectedFarm, setSelectedFarm]   = useState('');
  const [result, setResult]               = useState<DiseaseDetectionResult | null>(null);
  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState('');

  // ── Media state ──────────────────────────────────────────────
  const [mediaMode, setMediaMode]         = useState<MediaMode>('none');
  const [captureType, setCaptureType]     = useState<CaptureType>('photo');
  const [cameraActive, setCameraActive]   = useState(false);
  const [cameraError, setCameraError]     = useState('');
  const [recording, setRecording]         = useState(false);
  const [previewSrc, setPreviewSrc]       = useState<string | null>(null);
  const [previewType, setPreviewType]     = useState<'image' | 'video'>('image');
  const [mediaBase64, setMediaBase64]     = useState<string | null>(null);
  const [mediaMediaType, setMediaMimeType] = useState<string>('image/jpeg');

  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // ── Stop camera/stream ────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setRecording(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // ── Start camera ─────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('');
    setPreviewSrc(null);
    setMediaBase64(null);
    try {
      const constraints: MediaStreamConstraints = captureType === 'photo'
        ? { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }
        : { video: { facingMode: { ideal: 'environment' } }, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera: ' + (err.message ?? 'Unknown error'));
      }
    }
  };

  // ── Capture photo ─────────────────────────────────────────────
  const capturePhoto = () => {
    if (!videoRef.current || !cameraActive) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreviewSrc(url);
      setPreviewType('image');
      setMediaMimeType('image/jpeg');
      // base64 for API
      const reader = new FileReader();
      reader.onload = e => setMediaBase64((e.target?.result as string)?.split(',')[1] ?? null);
      reader.readAsDataURL(blob);
      stopStream();
    }, 'image/jpeg', 0.9);
  };

  // ── Start/stop video recording ────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreviewSrc(url);
      setPreviewType('video');
      setMediaMimeType('video/webm');
      // base64 for API
      const reader = new FileReader();
      reader.onload = e => setMediaBase64((e.target?.result as string)?.split(',')[1] ?? null);
      reader.readAsDataURL(blob);
      stopStream();
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  // ── Offline file upload ───────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    setPreviewSrc(url);
    setPreviewType(isVideo ? 'video' : 'image');
    setMediaMimeType(file.type);
    const reader = new FileReader();
    reader.onload = ev => setMediaBase64((ev.target?.result as string)?.split(',')[1] ?? null);
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setPreviewSrc(null);
    setMediaBase64(null);
    setPreviewType('image');
    stopStream();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Run analysis ─────────────────────────────────────────────
  const runAnalysis = async () => {
    const farmId = selectedFarm || farmList[0]?.id;
    if (!farmId && role !== 'admin') return;
    if (role === 'admin' && !farmId) return;

    setBusy(true); setError(''); setResult(null);
    try {
      const res = await aiService.detectDisease(farmId, mediaBase64 ? {
        media_data:   mediaBase64,
        media_type:   mediaMediaType,
        capture_mode: mediaMode as 'camera' | 'upload',
      } : undefined);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Disease analysis failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const canAnalyse = (farmList.length > 0 || (role === 'admin' && selectedFarm)) && !busy;

  return (
    <div>
      <Card>
        <SectionTitle>Farm Disease Risk Analysis</SectionTitle>
        <p style={{ fontSize: 14, color: 'var(--col-muted)', margin: '0 0 var(--sp-md)', lineHeight: 1.6 }}>
          Analyse recent activity logs to detect early disease signals. Optionally add a photo or video
          of your flock for a more accurate, visual assessment.
        </p>

        {/* Farm selector */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--sp-md)' }}>
          {farmList.length > 1 && (
            <div className="form-field" style={{ flex: 1, minWidth: 200, margin: 0 }}>
              <label>Select Farm</label>
              <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
                <option value="">-- Select farm --</option>
                {farmList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          {role === 'admin' && farmList.length === 0 && (
            <div className="form-field" style={{ flex: 1, minWidth: 200, margin: 0 }}>
              <label>Farm ID</label>
              <input type="text" placeholder="Enter farm UUID" value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} />
            </div>
          )}
        </div>

        {/* Media capture toggle */}
        <div style={{ marginBottom: 'var(--sp-md)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--col-text)', marginBottom: 8 }}>
            Add farm media <span style={{ color: 'var(--col-muted)', fontWeight: 400 }}>(optional — improves accuracy)</span>
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setMediaMode('none'); clearMedia(); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--col-border)',
                background: mediaMode === 'none' ? 'var(--col-primary)' : 'var(--col-surface)',
                color: mediaMode === 'none' ? '#fff' : 'var(--col-text)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Logs only
            </button>
            <button
              onClick={() => { setMediaMode('camera'); clearMedia(); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--col-border)',
                background: mediaMode === 'camera' ? 'var(--col-primary)' : 'var(--col-surface)',
                color: mediaMode === 'camera' ? '#fff' : 'var(--col-text)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Camera size={14} /> Live Camera
            </button>
            <button
              onClick={() => { setMediaMode('upload'); clearMedia(); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--col-border)',
                background: mediaMode === 'upload' ? 'var(--col-primary)' : 'var(--col-surface)',
                color: mediaMode === 'upload' ? '#fff' : 'var(--col-text)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Upload size={14} /> Upload Media
            </button>
          </div>
        </div>

        {/* ── CAMERA MODE ─────────────────────────────────────── */}
        {mediaMode === 'camera' && (
          <div style={{ marginBottom: 'var(--sp-md)', background: 'var(--col-chalk, #f7f4ee)', borderRadius: 12, padding: 16, border: '1px solid var(--col-border)' }}>
            {/* Photo / Video toggle */}
            {!cameraActive && !previewSrc && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['photo', 'video'] as CaptureType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setCaptureType(t)}
                    style={{
                      padding: '6px 14px', borderRadius: 7, border: '1px solid var(--col-border)',
                      background: captureType === t ? '#1a2410' : 'var(--col-surface)',
                      color: captureType === t ? '#fff' : 'var(--col-text)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {t === 'photo' ? <><ImageIcon size={13} /> Photo</> : <><Video size={13} /> Video</>}
                  </button>
                ))}
              </div>
            )}

            {cameraError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 13, marginBottom: 10 }}>
                <CameraOff size={16} /> {cameraError}
              </div>
            )}

            {/* Preview of captured media */}
            {previewSrc && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                {previewType === 'image'
                  ? <img src={previewSrc} alt="Captured" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 8 }} />
                  : <video src={previewSrc} controls style={{ width: '100%', maxHeight: 280, borderRadius: 8 }} />
                }
                <button
                  onClick={clearMedia}
                  style={{
                    position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                    border: 'none', borderRadius: '50%', width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} color="#fff" />
                </button>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--col-muted)' }}>
                  ✓ {previewType === 'image' ? 'Photo' : 'Video'} captured — ready for analysis
                </div>
              </div>
            )}

            {/* Live viewfinder */}
            {cameraActive && (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 8, background: '#000' }}
                />
                {recording && (
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: '#dc2626', color: '#fff', borderRadius: 20,
                    padding: '4px 10px', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'aiDot 1s ease-in-out infinite' }} />
                    REC
                  </div>
                )}
              </div>
            )}

            {/* Camera controls */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!cameraActive && !previewSrc && (
                <button
                  onClick={startCamera}
                  style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: '#1a2410', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                  }}
                >
                  <Camera size={15} /> Open Camera
                </button>
              )}

              {cameraActive && captureType === 'photo' && (
                <button
                  onClick={capturePhoto}
                  style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: 'var(--col-primary)', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                  }}
                >
                  <Maximize2 size={15} /> Capture Photo
                </button>
              )}

              {cameraActive && captureType === 'video' && !recording && (
                <button
                  onClick={startRecording}
                  style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: '#dc2626', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                  }}
                >
                  <Video size={15} /> Start Recording
                </button>
              )}

              {recording && (
                <button
                  onClick={stopRecording}
                  style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: '#1a2410', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                  }}
                >
                  ■ Stop Recording
                </button>
              )}

              {cameraActive && (
                <button
                  onClick={() => { stopStream(); setCameraError(''); }}
                  style={{
                    padding: '9px 14px', borderRadius: 8, border: '1px solid var(--col-border)',
                    background: 'var(--col-surface)', color: 'var(--col-text)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <X size={14} /> Cancel
                </button>
              )}

              {previewSrc && (
                <button
                  onClick={clearMedia}
                  style={{
                    padding: '9px 14px', borderRadius: 8, border: '1px solid var(--col-border)',
                    background: 'var(--col-surface)', color: 'var(--col-text)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <RefreshCw size={14} /> Retake
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── UPLOAD MODE ──────────────────────────────────────── */}
        {mediaMode === 'upload' && (
          <div style={{ marginBottom: 'var(--sp-md)' }}>
            {!previewSrc ? (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '28px 20px',
                  border: '2px dashed var(--col-border)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: 'var(--col-chalk, #f7f4ee)',
                  transition: 'border-color 0.2s',
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const syntheticEvent = { target: { files: e.dataTransfer.files } } as any;
                    handleFileChange(syntheticEvent);
                  }
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <ImageIcon size={28} color="var(--col-muted)" />
                  <Video size={28} color="var(--col-muted)" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--col-text)' }}>
                    Tap to upload or drag and drop
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--col-muted)' }}>
                    Photos (JPG, PNG, HEIC) or Videos (MP4, MOV, WEBM) — max 50MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <div style={{ position: 'relative' }}>
                {previewType === 'image'
                  ? <img src={previewSrc} alt="Uploaded" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 10 }} />
                  : <video src={previewSrc} controls style={{ width: '100%', maxHeight: 280, borderRadius: 10 }} />
                }
                <button
                  onClick={clearMedia}
                  style={{
                    position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)',
                    border: 'none', borderRadius: '50%', width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <X size={16} color="#fff" />
                </button>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--col-muted)' }}>
                  ✓ {previewType === 'image' ? 'Image' : 'Video'} ready for analysis
                </div>
              </div>
            )}
          </div>
        )}

        {/* Run button */}
        <Button
          onClick={runAnalysis}
          disabled={!canAnalyse}
          style={{ marginTop: 4 }}
        >
          {busy
            ? <><RefreshCw size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Analysing…</>
            : mediaBase64
              ? `🦠 Run Analysis${previewType === 'video' ? ' with Video' : ' with Photo'}`
              : '🦠 Run Analysis'
          }
        </Button>

        {error && (
          <p style={{ color: 'var(--col-danger)', marginTop: 12, fontSize: 14 }}>{error}</p>
        )}
      </Card>

      {/* ── RESULTS ─────────────────────────────────────────────── */}
      {result && (
        <Card style={{ marginTop: 'var(--sp-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
            <div style={{
              padding: '8px 18px', borderRadius: 20, fontWeight: 700, fontSize: 13,
              background: RISK_COLORS[result.risk_level] + '20',
              color: RISK_COLORS[result.risk_level],
              border: `1px solid ${RISK_COLORS[result.risk_level]}40`,
              textTransform: 'uppercase',
            }}>
              {result.risk_level} risk
            </div>
            <span style={{ fontSize: 13, color: 'var(--col-muted)' }}>
              Risk score: <strong>{result.risk_score}/100</strong>
            </span>
            {result.vet_consultation_required && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ea580c', fontSize: 13, fontWeight: 600 }}>
                <AlertTriangle size={14} /> Vet consultation required
              </div>
            )}
          </div>

          <p style={{ fontSize: 14, marginBottom: 'var(--sp-md)', lineHeight: 1.6 }}>{result.summary}</p>

          {result.detected_signals?.length > 0 && (
            <>
              <SectionTitle>Detected Signals</SectionTitle>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                {result.detected_signals.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <span style={{ color: RISK_COLORS[s.severity] ?? 'inherit', fontWeight: 600 }}>[{s.severity}]</span> {s.signal}
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.suspected_conditions?.length > 0 && (
            <>
              <SectionTitle>Suspected Conditions</SectionTitle>
              {result.suspected_conditions.map((c, i) => (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--col-border)', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {c.condition} <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>({c.confidence} confidence)</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>{c.reason}</div>
                </div>
              ))}
            </>
          )}

          {result.immediate_actions?.length > 0 && (
            <>
              <SectionTitle>Immediate Actions</SectionTitle>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                {result.immediate_actions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </>
          )}

          {result.preventive_recommendations?.length > 0 && (
            <>
              <SectionTitle>Preventive Recommendations</SectionTitle>
              <ul style={{ paddingLeft: 20, fontSize: 14, color: 'var(--col-muted)' }}>
                {result.preventive_recommendations.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </>
          )}

          <p style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 'var(--sp-md)', borderTop: '1px solid var(--col-border)', paddingTop: 8 }}>
            Generated: {new Date(result.generated_at).toLocaleString()} — Farm: {result.farm_name}
          </p>
        </Card>
      )}
    </div>
  );
}
