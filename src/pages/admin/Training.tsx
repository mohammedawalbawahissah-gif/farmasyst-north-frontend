import { useState } from 'react';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { trainingService } from '../../lib/services/training';
import { toArray } from '../../lib/api';
import type { TrainingModule } from '../../types';
import '../farmer/farmer.css';
import './admin.css';

export default function AdminTraining() {
  const modules  = useAsync(() => trainingService.listModules(), []);
  const [show, setShow]   = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc]   = useState('');
  const [type,     setType]     = useState('video');
  const [level,    setLevel]    = useState('beginner');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileObj,  setFileObj]  = useState<File | null>(null);
  const [mins, setMins]   = useState('');
  const [isFree, setFree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState('');

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
      if (videoUrl) fd.append('video_url', videoUrl);
      if (fileObj)  fd.append('file', fileObj);
      await trainingService.createModule(fd);
      setMsg('Module created successfully.');
      setShow(false); setTitle(''); setDesc(''); setMins('');
      setVideoUrl(''); setFileObj(null);
      modules.refetch();
    } catch { setMsg('Failed to create module.'); }
    finally { setSaving(false); }
  };

  const mods = toArray<TrainingModule>(modules.data);

  return (
    <div>
      <PageHeader title="Training Management" subtitle="Upload and manage training content for farmers."
        action={<Button size="sm" onClick={()=>setShow(s=>!s)}>{show?'Cancel':'+ New Module'}</Button>} />
      {msg && <p className="form-success" style={{marginBottom:'var(--sp-md)'}}>{msg}</p>}

      {show && (
        <Card style={{maxWidth:560,marginBottom:'var(--sp-xl)'}}>
          <h3 style={{marginBottom:'var(--sp-md)'}}>Create Training Module</h3>
          <div className="form-field"><label>Title *</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Broiler Biosecurity Basics" /></div>
          <div className="form-field"><label>Description</label><textarea rows={3} value={desc} onChange={e=>setDesc(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-field"><label>Type</label>
              <select value={type} onChange={e=>setType(e.target.value)}>
                {['video','pdf','webinar','workshop'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Level</label>
              <select value={level} onChange={e=>setLevel(e.target.value)}>
                {['beginner','intermediate','advanced'].map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Duration (mins)</label><input type="number" min="0" value={mins} onChange={e=>setMins(e.target.value)} /></div>
          </div>
          <div className="form-field">
            <label>📹 Video URL (YouTube / Vimeo)</label>
            <input type="url" placeholder="https://youtu.be/..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
          </div>
          <div className="form-field">
            <label>⬆️ Upload File (video / PDF)</label>
            <input type="file" accept="video/*,.pdf" onChange={e => setFileObj(e.target.files?.[0] ?? null)} />
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,marginBottom:'var(--sp-md)',cursor:'pointer'}}>
            <input type="checkbox" checked={isFree} onChange={e=>setFree(e.target.checked)} /> Free for all farmers
          </label>
          <Button disabled={!title||saving} onClick={handleCreate} style={{width:'100%'}}>
            {saving?'Publishing…':'Publish Module'}
          </Button>
        </Card>
      )}

      <SectionTitle>All Modules ({mods.length})</SectionTitle>
      <Card>
        {modules.loading ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading…</p>
        : mods.length === 0 ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No modules yet.</p>
        : (
          <table className="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Level</th><th>Duration</th><th>Free</th><th>Published</th></tr></thead>
            <tbody>
              {mods.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.title}</strong></td>
                  <td>{m.module_type}</td>
                  <td><Badge variant={m.level==='beginner'?'success':m.level==='intermediate'?'warning':'danger'}>{m.level}</Badge></td>
                  <td>{m.duration_minutes} min</td>
                  <td>{m.is_free?<Badge variant="success">Free</Badge>:<Badge variant="neutral">Paid</Badge>}</td>
                  <td>{m.is_published?<Badge variant="success">Live</Badge>:<Badge variant="neutral">Draft</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}