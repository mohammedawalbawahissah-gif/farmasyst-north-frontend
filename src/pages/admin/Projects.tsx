import { useState } from 'react';
import { PageHeader, Card, Button, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { projectService, type ProjectApplication } from '../../lib/services/projects';
import { toArray } from '../../lib/api';
import { ChevronDown, ChevronUp } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  draft: 'neutral', submitted: 'info', under_review: 'warning',
  approved: 'success', rejected: 'danger', disbursed: 'success', withdrawn: 'neutral',
};

export default function AdminProjects() {
  const projects = useAsync(() => projectService.list(), []);
  const list = toArray<ProjectApplication>(projects.data);

  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [busy,       setBusy]         = useState<string | null>(null);
  const [notes,      setNotes]        = useState('');
  const [reason,     setReason]       = useState('');
  const [actionFor,  setActionFor]    = useState<string | null>(null);
  const [actionType, setActionType]   = useState<'approve' | 'reject' | null>(null);
  const [msg,        setMsg]          = useState('');
  const [msgType,    setMsgType]      = useState<'success' | 'error'>('success');

  const openAction = (id: string, type: 'approve' | 'reject') => {
    setActionFor(id); setActionType(type); setNotes(''); setReason('');
  };

  const handleAction = async () => {
    if (!actionFor || !actionType) return;
    if (actionType === 'reject' && !reason.trim()) {
      setMsg('Please provide a rejection reason.'); setMsgType('error'); return;
    }
    setBusy(actionFor);
    try {
      if (actionType === 'approve') {
        await projectService.approve(actionFor, notes);
        setMsg('Project approved and applicant notified.');
      } else {
        await projectService.reject(actionFor, reason, notes);
        setMsg('Project rejected and applicant notified.');
      }
      setMsgType('success');
      setActionFor(null); setActionType(null);
      projects.refetch();
    } catch {
      setMsg('Action failed.'); setMsgType('error');
    } finally {
      setBusy(null);
    }
  };

  const submitted = list.filter(p => ['submitted', 'under_review'].includes(p.status));
  const others    = list.filter(p => !['submitted', 'under_review'].includes(p.status));

  return (
    <div>
      <PageHeader title="Project Applications" subtitle="Organisation-based group credit applications." />

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 'var(--sp-md)',
          background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
          color: msgType === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          fontSize: 14,
        }}>
          {msg}
        </div>
      )}

      {submitted.length > 0 && (
        <>
          <SectionTitle>Pending Review ({submitted.length})</SectionTitle>
          {submitted.map(proj => <ProjectCard key={proj.id} proj={proj} expanded={expandedId === proj.id}
            onToggle={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
            onAction={openAction} busy={busy === proj.id} />)}
        </>
      )}

      {/* Action modal */}
      {actionFor && actionType && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <Card style={{ maxWidth: 480, width: '90%' }}>
            <SectionTitle>{actionType === 'approve' ? 'Approve Project' : 'Reject Project'}</SectionTitle>
            {actionType === 'reject' && (
              <div className="form-field">
                <label>Rejection Reason <span className="required">*</span></label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Provide a clear reason for rejection…" />
              </div>
            )}
            <div className="form-field">
              <label>Reviewer Notes (optional)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes…" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 'var(--sp-sm)' }}>
              <Button onClick={handleAction} disabled={!!busy}
                style={{ background: actionType === 'approve' ? '#16a34a' : '#dc2626', color: '#fff' }}>
                {busy ? 'Processing…' : actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </Button>
              <Button onClick={() => { setActionFor(null); setActionType(null); }}
                style={{ background: 'var(--col-surface)', color: 'var(--col-text)', border: '1px solid var(--col-border)' }}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <SectionTitle style={{ marginTop: 'var(--sp-lg)' }}>All Projects ({list.length})</SectionTitle>
      {projects.loading ? (
        <p style={{ color: 'var(--col-muted)', fontSize: 14 }}>Loading…</p>
      ) : list.length === 0 ? (
        <Card><p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No project applications yet.</p></Card>
      ) : others.concat(submitted).map(proj => (
        <ProjectCard key={proj.id} proj={proj} expanded={expandedId === proj.id}
          onToggle={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
          onAction={openAction} busy={busy === proj.id} />
      ))}
    </div>
  );
}

function ProjectCard({ proj, expanded, onToggle, onAction, busy }: {
  proj: ProjectApplication;
  expanded: boolean;
  onToggle: () => void;
  onAction: (id: string, type: 'approve' | 'reject') => void;
  busy: boolean;
}) {
  const canAct = ['submitted', 'under_review'].includes(proj.status);
  return (
    <Card style={{ marginBottom: 'var(--sp-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15 }}>{proj.project_name}</strong>
            <Badge variant={STATUS_VARIANT[proj.status] ?? 'neutral'}>{proj.status.replace(/_/g, ' ')}</Badge>
            <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>{proj.reference}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--col-muted)' }}>
            {proj.organisation} · {proj.submitted_by_name ?? 'Unknown'} · {proj.farmer_count} farmer{proj.farmer_count !== 1 ? 's' : ''}
            {proj.total_amount_requested ? ` · GHS ${Number(proj.total_amount_requested).toLocaleString()}` : ''}
            {proj.submitted_at ? ` · Submitted ${new Date(proj.submitted_at).toLocaleDateString()}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canAct && (
            <>
              <Button onClick={() => onAction(proj.id, 'approve')} disabled={busy}
                style={{ fontSize: 12, padding: '6px 14px', background: '#16a34a', color: '#fff' }}>
                Approve
              </Button>
              <Button onClick={() => onAction(proj.id, 'reject')} disabled={busy}
                style={{ fontSize: 12, padding: '6px 14px', background: '#dc2626', color: '#fff' }}>
                Reject
              </Button>
            </>
          )}
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--sp-md)', borderTop: '1px solid var(--col-border)', paddingTop: 'var(--sp-md)' }}>
          <p style={{ fontSize: 14, marginBottom: 'var(--sp-sm)' }}><strong>Purpose:</strong> {proj.purpose}</p>
          {proj.rejection_reason && <p style={{ fontSize: 14, color: 'var(--col-danger)' }}><strong>Rejection:</strong> {proj.rejection_reason}</p>}
          {proj.reviewer_notes   && <p style={{ fontSize: 14 }}><strong>Notes:</strong> {proj.reviewer_notes}</p>}

          <SectionTitle>Farmer Entries ({proj.farmer_count})</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Phone</th><th>Ghana Card</th>
                  <th>District</th><th>Region</th><th>Farm</th>
                  <th>Flock</th><th>Size</th><th>Amount (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {proj.farmer_entries.map(fe => (
                  <tr key={fe.id}>
                    <td><strong>{fe.full_name}</strong></td>
                    <td>{fe.phone || '—'}</td>
                    <td className="data-table__mono">{fe.ghana_card_number || '—'}</td>
                    <td>{fe.district || '—'}</td>
                    <td>{fe.region || '—'}</td>
                    <td>{fe.farm_name || '—'}</td>
                    <td>{fe.flock_type ? fe.flock_type.replace(/_/g, ' ') : '—'}</td>
                    <td>{fe.flock_size ? fe.flock_size.toLocaleString() : '—'}</td>
                    <td>{fe.amount_requested ? Number(fe.amount_requested).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
