import { PageHeader, Card, Badge, Button, SectionTitle, StatCard } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { trainingService } from '../../lib/services/training';
import { BookOpen, PlayCircle, FileText, Calendar, Award } from 'lucide-react';
import './farmer.css';

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <PlayCircle size={16} />, pdf: <FileText size={16} />,
  webinar: <Calendar size={16} />, workshop: <Award size={16} />,
};
const LEVEL_BADGE: Record<string, 'success'|'warning'|'danger'> = {
  beginner:'success', intermediate:'warning', advanced:'danger',
};

export default function Training() {
  const modules  = useAsync(() => trainingService.listModules(), []);
  const enrols   = useAsync(() => trainingService.listEnrolments(), []);

  const enrolMap = Object.fromEntries((toArray(enrols.data)).map(e => [e.module, e]));

  const completed  = toArray(enrols.data).filter(e => e.status === 'completed').length ?? 0;
  const inProgress = toArray(enrols.data).filter(e => e.status === 'in_progress').length ?? 0;
  const totalMods  = toArray(modules.data).length;

  const handleEnrol = async (moduleId: string) => {
    try { await trainingService.enrol(moduleId); enrols.refetch(); }
    catch { /* show error in future iteration */ }
  };

  const handleProgress = async (enrolId: string, pct: number) => {
    try { await trainingService.updateProgress(enrolId, pct); enrols.refetch(); }
    catch { /* ignore */ }
  };

  return (
    <div>
      <PageHeader title="Training Resources" subtitle="Video modules, PDF guides, and webinar recordings." />

      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        <StatCard label="Available Modules" value={totalMods} sub="Curated by FarmAsyst North" icon={<BookOpen size={16}/>} accent="#5C2D8B" />
        <StatCard label="Enrolled"    value={toArray(enrols.data).length} sub="Active enrolments" accent="#1A4A6B" />
        <StatCard label="In Progress" value={inProgress} sub="Currently active" accent="#E8A020" />
        <StatCard label="Completed"   value={completed}  sub="Modules finished" accent="#4A7C2F" />
      </div>

      {modules.loading
        ? <p style={{color:'var(--col-muted)'}}>Loading modules…</p>
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--sp-md)' }}>
            {modules.data!.results.map(mod => {
              const enrol = enrolMap[mod.id];
              return (
                <Card key={mod.id} style={{ display:'flex', flexDirection:'column', gap:'var(--sp-sm)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)' }}>
                    <span style={{ padding:'6px', background:'var(--col-surface)', borderRadius:6 }}>{TYPE_ICON[mod.module_type] ?? <BookOpen size={16}/>}</span>
                    <Badge variant={LEVEL_BADGE[mod.level]}>{mod.level}</Badge>
                    {mod.is_free && <Badge variant="success">Free</Badge>}
                  </div>
                  <strong style={{ fontSize:14 }}>{mod.title}</strong>
                  <p style={{ fontSize:13, color:'var(--col-muted)', flex:1 }}>{mod.description}</p>
                  <div style={{ fontSize:12, color:'var(--col-muted)' }}>{mod.duration_minutes} mins · {mod.module_type}</div>

                  {enrol ? (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span>{enrol.status.replace('_',' ')}</span>
                        <span>{enrol.progress_pct}%</span>
                      </div>
                      <div style={{ background:'var(--col-border)', borderRadius:4, height:6 }}>
                        <div style={{ width:`${enrol.progress_pct}%`, background:'var(--col-primary)', height:6, borderRadius:4 }} />
                      </div>
                      {enrol.status !== 'completed' && (
                        <Button size="sm" variant="secondary" style={{ marginTop:'var(--sp-sm)', width:'100%' }}
                          onClick={() => handleProgress(enrol.id, Math.min(enrol.progress_pct + 25, 100))}>
                          Mark Progress +25%
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" style={{ width:'100%' }} onClick={() => handleEnrol(mod.id)}>Enrol Now</Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}