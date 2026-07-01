import { useState } from 'react';
import { PageHeader, Card, Badge, Button, StatCard } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { trainingService } from '../../lib/services/training';
import type { TrainingEnrolment } from '../../types';
import { BookOpen, PlayCircle, FileText, Calendar, Award, X, ExternalLink } from 'lucide-react';
import './farmer.css';

const TYPE_ICON: Record<string, React.ReactNode> = {
  video:   <PlayCircle size={18} />,
  pdf:     <FileText  size={18} />,
  webinar: <Calendar  size={18} />,
  quiz:    <Award     size={18} />,
};

const LEVEL_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  beginner: 'success', intermediate: 'warning', advanced: 'danger',
};

// ── Convert any YouTube/Vimeo URL → embeddable URL ──────────────────────────
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
  return url; // fallback — let the iframe try
}

interface Module {
  id: string; title: string; description: string;
  module_type: string; level: string; is_free: boolean;
  duration_minutes: number; video_url?: string; file?: string;
}

export default function Training() {
  const modules = useAsync(() => trainingService.listModules(), []);
  const enrols  = useAsync(() => trainingService.listEnrolments(), []);

  const [activeModule, setActiveModule] = useState<Module | null>(null);

  const modList  = toArray<Module>(modules.data);
  const enrolList = toArray<TrainingEnrolment>(enrols.data);
  const enrolMap  = Object.fromEntries(enrolList.map((e) => [e.module, e]));

  const completed  = enrolList.filter((e) => e.status === 'completed').length;
  const inProgress = enrolList.filter((e) => e.status === 'in_progress').length;

  const handleEnrol = async (moduleId: string) => {
    try { await trainingService.enrol(moduleId); enrols.refetch(); }
    catch { /* ignore */ }
  };

  const handleProgress = async (enrolId: string, pct: number) => {
    try { await trainingService.updateProgress(enrolId, pct); enrols.refetch(); }
    catch { /* ignore */ }
  };

  const openModule = async (mod: Module) => {
    // Auto-enrol if not already enrolled
    if (!enrolMap[mod.id]) {
      try { await trainingService.enrol(mod.id); enrols.refetch(); } catch { /* ignore */ }
    }
    setActiveModule(mod);
  };

  // ── Content viewer modal ─────────────────────────────────────────────────
  const renderViewer = () => {
    if (!activeModule) return null;
    const mod = activeModule;
    const enrol = enrolMap[mod.id];
    const embedUrl = mod.video_url ? toEmbedUrl(mod.video_url) : null;

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '24px var(--sp-lg) var(--sp-lg)', overflowY: 'auto',
      }}
        onClick={e => { if (e.target === e.currentTarget) setActiveModule(null); }}
      >
        <div style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 860,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: 'var(--sp-md) var(--sp-lg)', borderBottom: '1px solid var(--col-border)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {TYPE_ICON[mod.module_type]}
                <Badge variant={LEVEL_BADGE[mod.level]}>{mod.level}</Badge>
                {mod.is_free && <Badge variant="success">Free</Badge>}
              </div>
              <h3 style={{ margin: 0 }}>{mod.title}</h3>
              {mod.description && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--col-muted)' }}>{mod.description}</p>
              )}
            </div>
            <button onClick={() => setActiveModule(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: 'var(--col-muted)',
            }}>
              <X size={20} />
            </button>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sp-lg)' }}>

            {/* ── VIDEO ── */}
            {mod.module_type === 'video' && (
              embedUrl
                ? (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden' }}>
                    <iframe
                      src={embedUrl}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      title={mod.title}
                    />
                  </div>
                )
                : mod.file
                ? (
                  <video controls style={{ width: '100%', borderRadius: 8 }}>
                    <source src={mod.file} />
                    Your browser does not support video playback.
                  </video>
                )
                : <p style={{ color: 'var(--col-muted)' }}>No video content available for this module.</p>
            )}

            {/* ── PDF ── */}
            {mod.module_type === 'pdf' && (
              mod.file
                ? (
                  <div>
                    <iframe
                      src={mod.file}
                      style={{ width: '100%', height: 520, border: 'none', borderRadius: 8 }}
                      title={mod.title}
                    />
                    <a href={mod.file} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, color: 'var(--col-primary)' }}>
                      <ExternalLink size={14} /> Open PDF in new tab
                    </a>
                  </div>
                )
                : <p style={{ color: 'var(--col-muted)' }}>No PDF file attached to this module.</p>
            )}

            {/* ── WEBINAR ── */}
            {mod.module_type === 'webinar' && (
              <div>
                {embedUrl
                  ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden' }}>
                      <iframe
                        src={embedUrl}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                        title={mod.title}
                      />
                    </div>
                  )
                  : (
                    <div style={{
                      textAlign: 'center', padding: 'var(--sp-xl)',
                      background: 'var(--col-surface)', borderRadius: 8,
                    }}>
                      <Calendar size={40} style={{ color: 'var(--col-muted)', marginBottom: 12 }} />
                      <p style={{ fontWeight: 600 }}>Webinar Recording</p>
                      {mod.video_url && (
                        <a href={mod.video_url} target="_blank" rel="noreferrer">
                          <Button style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <ExternalLink size={14} /> Watch Webinar
                          </Button>
                        </a>
                      )}
                    </div>
                  )
                }
              </div>
            )}

            {/* ── QUIZ ── */}
            {mod.module_type === 'quiz' && (
              <div style={{
                textAlign: 'center', padding: 'var(--sp-xl)',
                background: 'var(--col-surface)', borderRadius: 8,
              }}>
                <Award size={40} style={{ color: 'var(--col-primary)', marginBottom: 12 }} />
                <p style={{ fontWeight: 600, marginBottom: 8 }}>Quiz Module</p>
                <p style={{ color: 'var(--col-muted)', fontSize: 13, marginBottom: 16 }}>
                  Complete this quiz to test your knowledge and earn a completion certificate.
                </p>
                {mod.video_url && (
                  <a href={mod.video_url} target="_blank" rel="noreferrer">
                    <Button style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ExternalLink size={14} /> Open Quiz
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Progress footer */}
          {enrol && (
            <div style={{
              padding: 'var(--sp-md) var(--sp-lg)',
              borderTop: '1px solid var(--col-border)',
              display: 'flex', alignItems: 'center', gap: 'var(--sp-lg)', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--col-muted)' }}>Progress</span>
                  <span><strong>{enrol.progress_pct}%</strong></span>
                </div>
                <div style={{ background: 'var(--col-border)', borderRadius: 4, height: 8 }}>
                  <div style={{
                    width: `${enrol.progress_pct}%`,
                    background: enrol.progress_pct === 100 ? 'var(--col-success)' : 'var(--col-primary)',
                    height: 8, borderRadius: 4, transition: 'width 0.3s',
                  }} />
                </div>
              </div>
              {enrol.status === 'completed'
                ? <Badge variant="success">✓ Completed</Badge>
                : (
                  <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
                    <Button size="sm" variant="secondary"
                      onClick={() => handleProgress(enrol.id, Math.min(enrol.progress_pct + 25, 100))}>
                      +25%
                    </Button>
                    <Button size="sm"
                      onClick={() => handleProgress(enrol.id, 100)}>
                      Mark Complete
                    </Button>
                  </div>
                )
              }
            </div>
          )}
        </div>
        {/* Close button below the modal — always visible */}
        <button
          onClick={() => setActiveModule(null)}
          style={{
            marginTop: 'var(--sp-md)', background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
            color: '#fff', padding: '10px 28px', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <X size={16} /> Close Module
        </button>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Training Resources" subtitle="Video modules, PDF guides, and webinar recordings." />

      {/* ── Stats ── */}
      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Available Modules" value={modList.length}       sub="Curated by FarmAsyst North" accent="#5C2D8B" />
        <StatCard label="Enrolled"          value={enrolList.length}     sub="Active enrolments"          accent="#1A4A6B" />
        <StatCard label="In Progress"       value={inProgress}           sub="Currently active"           accent="#E8A020" />
        <StatCard label="Completed"         value={completed}            sub="Modules finished"           accent="#4A7C2F" />
      </div>

      {/* ── Module grid ── */}
      {modules.loading
        ? <p style={{ color: 'var(--col-muted)' }}>Loading modules…</p>
        : modList.length === 0
        ? <p style={{ color: 'var(--col-muted)' }}>No training modules available yet.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-md)' }}>
            {modList.map(mod => {
              const enrol = enrolMap[mod.id];
              const hasContent = mod.video_url || mod.file;
              return (
                <Card key={mod.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
                  {/* Type icon + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: 6, background: 'var(--col-surface)', borderRadius: 6 }}>
                      {TYPE_ICON[mod.module_type] ?? <BookOpen size={18} />}
                    </span>
                    <Badge variant={LEVEL_BADGE[mod.level]}>{mod.level}</Badge>
                    {mod.is_free && <Badge variant="success">Free</Badge>}
                    {enrol?.status === 'completed' && <Badge variant="success">✓ Done</Badge>}
                  </div>

                  <strong style={{ fontSize: 14 }}>{mod.title}</strong>

                  {mod.description && (
                    <p style={{ fontSize: 13, color: 'var(--col-muted)', flex: 1, margin: 0 }}>
                      {mod.description}
                    </p>
                  )}

                  <div style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                    {mod.duration_minutes ? `${mod.duration_minutes} mins` : 'Duration TBD'} · {mod.module_type}
                  </div>

                  {/* Progress bar if enrolled */}
                  {enrol && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--col-muted)' }}>{enrol.status.replace('_', ' ')}</span>
                        <span>{enrol.progress_pct}%</span>
                      </div>
                      <div style={{ background: 'var(--col-border)', borderRadius: 4, height: 6 }}>
                        <div style={{
                          width: `${enrol.progress_pct}%`,
                          background: enrol.progress_pct === 100 ? 'var(--col-success)' : 'var(--col-primary)',
                          height: 6, borderRadius: 4,
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  {hasContent
                    ? (
                      <Button
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={() => openModule(mod)}
                      >
                        {TYPE_ICON[mod.module_type]}
                        {enrol ? (enrol.status === 'completed' ? 'Review Module' : 'Continue') : 'Start Module'}
                      </Button>
                    )
                    : !enrol
                    ? (
                      <Button size="sm" style={{ width: '100%' }} onClick={() => handleEnrol(mod.id)}>
                        Enrol Now
                      </Button>
                    )
                    : <p style={{ fontSize: 12, color: 'var(--col-muted)', textAlign: 'center' }}>Content coming soon</p>
                  }
                </Card>
              );
            })}
          </div>
        )
      }

      {/* Content viewer modal */}
      {renderViewer()}
    </div>
  );
}
