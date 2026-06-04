import { PageHeader, Card, Badge, SectionTitle } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import './investor.css';

const OUTCOME_BADGE: Record<string, 'success'|'warning'|'danger'> = {
  satisfactory:'success', concerns:'warning', unsatisfactory:'danger',
};

export default function DueDiligence() {
  const audits = useAsync(() => farmsService.listAudits(), []);
  const farms  = useAsync(() => farmsService.list(), []);

  const farmMap = Object.fromEntries((toArray(farms.data)).map(f => [f.id, f]));

  return (
    <div>
      <PageHeader title="Due Diligence" subtitle="Farm audit reports, field visit logs, and performance history." />

      <SectionTitle>Field Audit Reports</SectionTitle>
      {audits.loading
        ? <p style={{color:'var(--col-muted)'}}>Loading audit reports…</p>
        : (toArray(audits.data).length) === 0
        ? <Card><p style={{padding:'var(--sp-lg)',color:'var(--col-muted)',textAlign:'center'}}>No audit reports available yet.</p></Card>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-md)' }}>
            {audits.data!.results.map(r => {
              const farm = farmMap[r.farm];
              const avgScore = Math.round((r.infrastructure_score + r.management_score + r.biosecurity_score) / 3);
              return (
                <Card key={r.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--sp-md)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-sm)', marginBottom:6 }}>
                        <strong>{farm?.name ?? 'Farm'}</strong>
                        <Badge variant={OUTCOME_BADGE[r.outcome]}>{r.outcome.replace('_',' ')}</Badge>
                      </div>
                      <div style={{fontSize:13,color:'var(--col-muted)',marginBottom:8}}>
                        {farm?.district && `${farm.district}, ${farm.region} · `}
                        Visit: {new Date(r.visit_date).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}
                      </div>
                      <p style={{fontSize:13,marginBottom:8}}>{r.summary}</p>
                      <div style={{ display:'flex', gap:'var(--sp-lg)', fontSize:13 }}>
                        <div><span style={{color:'var(--col-muted)'}}>Infrastructure</span><br/><strong>{r.infrastructure_score}/10</strong></div>
                        <div><span style={{color:'var(--col-muted)'}}>Management</span><br/><strong>{r.management_score}/10</strong></div>
                        <div><span style={{color:'var(--col-muted)'}}>Biosecurity</span><br/><strong>{r.biosecurity_score}/10</strong></div>
                        <div><span style={{color:'var(--col-muted)'}}>Average</span><br/><strong style={{color: avgScore>=7?'var(--col-success)':avgScore>=5?'var(--col-warning)':'var(--col-danger)'}}>{avgScore}/10</strong></div>
                        <div><span style={{color:'var(--col-muted)'}}>Flock verified</span><br/><strong>{r.flock_verified.toLocaleString()}</strong></div>
                      </div>
                    </div>
                    {r.report_document && (
                      <a href={r.report_document} target="_blank" rel="noreferrer" style={{fontSize:12,whiteSpace:'nowrap'}}>Download Report</a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}