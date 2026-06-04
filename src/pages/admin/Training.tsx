import { useState, useRef } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { trainingService } from '../../lib/services/training';
import { toArray } from '../../lib/api';
import { Upload, Calendar, Video } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

const FILE_ACCEPT: Record<string, string> = {
  video:    'video/*',
  audio:    'audio/*',
  pdf:      '.pdf',
  document: '.doc,.docx,.pdf,.ppt,.pptx',
  webinar:  '',   // no file upload for live webinar
  workshop: '',
  quiz:     '',
};

const NEEDS_FILE = (t: string) => ['video', 'audio', 'pdf', 'document'].includes(t);
const NEEDS_SCHEDULE = (t: string) => ['webinar', 'workshop'].includes(t);

export default function AdminTraining() {
  const modules  = useAsync(() => trainingService.listModules(), []);
  const fileRef  = useRef<HTMLInputElement>(null);

  const [show,     setShow]    = useState(false);
  const [title,    setTitle]   = useState('');
  const [desc,     setDesc]    = useState('');
  const [type,     setType]    = useState('video');
  const [level,    setLevel]   = useState('beginner');
  const [mins,     setMins]    = useState('');
  const [isFree,   setFree]    = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [file,     setFile]    = useState<File | null>(null);

  // Webinar / workshop scheduling
  const [scheduledAt,      setScheduledAt]      = useState('');
  const [scheduledTime,    setScheduledTime]    = useState('');
  const [meetingUrl,       setMeetingUrl]       = useState('');
  const [meetingPlatform,  setMeetingPlatform]  = useState('google_meet');

  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const resetForm = () => {
    setTitle(''); setDesc(''); setType('video'); setLevel('beginner');
    setMins(''); setFree(true); setVideoUrl(''); setFile(null);
    setScheduledAt(''); setScheduledTime(''); setMeetingUrl(''); setMeetingPlatform('google_meet');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!title) return;
    setSaving(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', desc);
      fd.append('module_type', type);
      fd.append('level', level);
      fd.append('duration_minutes', mins || '0');
      fd.append('is_free', String(isFree));
      fd.append('is_published', 'true');

      if (NEEDS_FILE(type) && file) fd.append('file', file);
      if (type === 'video' && videoUrl) fd.append('video_url', videoUrl);

      if (NEEDS_SCHEDULE(type)) {
        if (scheduledAt && scheduledTime) {
          fd.append('scheduled_at', `${scheduledAt}T${scheduledTime}`);
        }
        if (meetingUrl) fd.append('meeting_url', meetingUrl);
        fd.append('meeting_platform', meetingPlatform);
      }

      await trainingService.createModule(fd);
      setMsg('Module published successfully.');
      setMsgType('success');
      setShow(false);
      resetForm();
      modules.refetch();
    } catch {
      setMsg('Failed to create module. Please check the details and try again.');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const mods = toArray(modules.data);

  return (
    <div>
      <PageHeader
        title="Training Management"
        subtitle="Upload and manage training content for farmers."
        action={<Button size="sm" onClick={() => { setShow(s => !s); if (show) resetForm(); }}>{show ? 'Cancel' : '+ New Module'}</Button>}
      />

      {msg && (
        <p className={msgType === 'success' ? 'form-success' : 'form-error'} style={{ marginBottom: 'var(--sp-md)' }}>
          {msg}
        </p>
      )}

      {show && (
        <Card style={{ maxWidth: 600, marginBottom: 'var(--sp-xl)' }}>
          <h3 style={{ marginBottom: 'var(--sp-md)' }}>Create Training Module</h3>

          <div className="form-field">
            <label>Title <span className="required">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Broiler Biosecurity Basics" />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Type</label>
              <select value={type} onChange={e => { setType(e.target.value); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="pdf">PDF Guide</option>
                <option value="document">Document</option>
                <option value="webinar">Live Webinar</option>
                <option value="workshop">Workshop</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div className="form-field">
              <label>Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)}>
                {['beginner', 'intermediate', 'advanced'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Duration (mins)</label>
              <input type="number" min="0" value={mins} onChange={e => setMins(e.target.value)} />
            </div>
          </div>

          {/* File upload — only for media/document types */}
          {NEEDS_FILE(type) && (
            <div className="form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} /> Upload {type === 'video' ? 'Video File' : type === 'audio' ? 'Audio File' : 'File'}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept={FILE_ACCEPT[type]}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                style={{ padding: '6px 0' }}
              />
              {file && (
                <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </div>
          )}

          {/* Video URL option for video type */}
          {type === 'video' && (
            <div className="form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Video size={14} /> Or Video URL (YouTube / Vimeo)
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
              />
            </div>
          )}

          {/* Webinar / Workshop scheduling */}
          {NEEDS_SCHEDULE(type) && (
            <div style={{
              background: '#f0f7ff', border: '1px solid #b3d4ff', borderRadius: 8,
              padding: 'var(--sp-md)', marginBottom: 'var(--sp-md)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, marginBottom: 'var(--sp-sm)' }}>
                <Calendar size={14} /> Schedule {type === 'webinar' ? 'Webinar' : 'Workshop'}
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Date</label>
                  <input type="date" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Time</label>
                  <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Platform</label>
                  <select value={meetingPlatform} onChange={e => setMeetingPlatform(e.target.value)}>
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Meeting Link</label>
                <input
                  type="url"
                  placeholder={meetingPlatform === 'google_meet' ? 'https://meet.google.com/xxx-xxxx-xxx' : 'https://zoom.us/j/...'}
                  value={meetingUrl}
                  onChange={e => setMeetingUrl(e.target.value)}
                />
              </div>
              {meetingUrl && scheduledAt && scheduledTime && (
                <div style={{ fontSize: 12, color: '#1a5fa8', background: '#ddeeff', borderRadius: 6, padding: '8px 12px' }}>
                  📅 Scheduled for {new Date(`${scheduledAt}T${scheduledTime}`).toLocaleString('en-GH', { dateStyle: 'full', timeStyle: 'short' })} via{' '}
                  {meetingPlatform === 'google_meet' ? 'Google Meet' : meetingPlatform === 'zoom' ? 'Zoom' : 'Online Platform'}
                </div>
              )}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 'var(--sp-md)', cursor: 'pointer' }}>
            <input type="checkbox" checked={isFree} onChange={e => setFree(e.target.checked)} /> Free for all farmers
          </label>

          <Button disabled={!title || saving} onClick={handleCreate} style={{ width: '100%' }}>
            {saving ? 'Publishing…' : 'Publish Module'}
          </Button>
        </Card>
      )}

      <SectionTitle>All Modules ({mods.length})</SectionTitle>
      <Card>
        {modules.loading ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading…</p>
        ) : mods.length === 0 ? (
          <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No modules yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Type</th><th>Level</th><th>Duration</th><th>Scheduled</th><th>Free</th><th>Published</th></tr>
            </thead>
            <tbody>
              {mods.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.title}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{m.module_type.replace('_', ' ')}</td>
                  <td><Badge variant={m.level === 'beginner' ? 'success' : m.level === 'intermediate' ? 'warning' : 'danger'}>{m.level}</Badge></td>
                  <td>{m.duration_minutes ? `${m.duration_minutes} min` : '—'}</td>
                  <td style={{ fontSize: 12 }}>
                    {m.scheduled_at
                      ? new Date(m.scheduled_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                    {m.meeting_platform && m.scheduled_at && (
                      <span style={{ display: 'block', color: 'var(--col-muted)' }}>
                        {m.meeting_platform === 'google_meet' ? '📹 Meet' : m.meeting_platform === 'zoom' ? '💻 Zoom' : '🔗 Online'}
                      </span>
                    )}
                  </td>
                  <td>{m.is_free ? <Badge variant="success">Free</Badge> : <Badge variant="neutral">Paid</Badge>}</td>
                  <td>{m.is_published ? <Badge variant="success">Live</Badge> : <Badge variant="neutral">Draft</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
