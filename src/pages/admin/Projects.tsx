import { useState } from 'react';
import { PageHeader, Card, Button, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { projectService, type ProjectApplication, type ProjectFarmerEntry } from '../../lib/services/projects';
import { toArray } from '../../lib/api';
import { ChevronDown, ChevronUp, Plus, Trash2, UserPlus, Send, X } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  draft: 'neutral', submitted: 'info', under_review: 'warning',
  approved: 'success', rejected: 'danger', disbursed: 'success', withdrawn: 'neutral',
};

const FLOCK_TYPES = ['broilers', 'layers', 'guinea_fowl', 'local_birds', 'mixed'];
const CREDIT_TYPES = ['direct_financing', 'farm_inputs', 'structured_training', 'mixed'];
const REGIONS = ['Northern', 'North East', 'Savannah', 'Upper East', 'Upper West', 'Oti', 'Bono East', 'Ahafo', 'Bono', 'Other'];

// ── Blank farmer entry template ────────────────────────────────────────────
const blankFarmer = (): Omit<ProjectFarmerEntry, 'id' | 'project' | 'created_at'> => ({
  farmer_account: null,
  full_name: '',
  phone: '',
  ghana_card_number: '',
  district: '',
  region: 'Northern',
  community: '',
  farm_name: '',
  flock_type: 'broilers',
  flock_size: 0,
  farm_size_acres: '',
  amount_requested: '',
  notes: '',
});

// ── Blank project template ─────────────────────────────────────────────────
const blankProject = () => ({
  project_name: '',
  organisation: '',
  credit_type: 'direct_financing',
  total_amount_requested: '',
  repayment_period_months: '',
  purpose: '',
});

type View = 'list' | 'create';
type FarmerDraft = ReturnType<typeof blankFarmer>;

export default function AdminProjects() {
  const projects = useAsync(() => projectService.list(), []);
  const list = toArray<ProjectApplication>(projects.data);

  const [view, setView] = useState<View>('list');

  // ── Review state ────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy,       setBusy]       = useState<string | null>(null);
  const [notes,      setNotes]      = useState('');
  const [reason,     setReason]     = useState('');
  const [actionFor,  setActionFor]  = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [msg,        setMsg]        = useState('');
  const [msgType,    setMsgType]    = useState<'success' | 'error'>('success');

  // ── Create state ────────────────────────────────────────────────────────
  const [projectDraft,  setProjectDraft]  = useState(blankProject());
  const [farmerDrafts,  setFarmerDrafts]  = useState<FarmerDraft[]>([blankFarmer()]);
  const [createBusy,    setCreateBusy]    = useState(false);
  const [createError,   setCreateError]   = useState('');
  const [createStep,    setCreateStep]    = useState<'details' | 'farmers'>('details');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  // ── Review handlers ─────────────────────────────────────────────────────
  const openAction = (id: string, type: 'approve' | 'reject') => {
    setActionFor(id); setActionType(type); setNotes(''); setReason('');
  };

  const handleAction = async () => {
    if (!actionFor || !actionType) return;
    if (actionType === 'reject' && !reason.trim()) {
      showMsg('Please provide a rejection reason.', 'error'); return;
    }
    setBusy(actionFor);
    try {
      if (actionType === 'approve') {
        await projectService.approve(actionFor, notes);
        showMsg('Project approved and applicant notified.');
      } else {
        await projectService.reject(actionFor, reason, notes);
        showMsg('Project rejected and applicant notified.');
      }
      setActionFor(null); setActionType(null);
      projects.refetch();
    } catch {
      showMsg('Action failed. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  // ── Create handlers ─────────────────────────────────────────────────────
  const updateFarmer = (idx: number, field: keyof FarmerDraft, value: string | number | null) => {
    setFarmerDrafts(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const addFarmerRow = () => setFarmerDrafts(prev => [...prev, blankFarmer()]);
  const removeFarmerRow = (idx: number) => {
    if (farmerDrafts.length === 1) return;
    setFarmerDrafts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async (submitAfter: boolean) => {
    // Validate project details
    if (!projectDraft.project_name.trim()) { setCreateError('Project name is required.'); return; }
    if (!projectDraft.organisation.trim())  { setCreateError('Organisation name is required.'); return; }
    if (!projectDraft.purpose.trim())       { setCreateError('Purpose is required.'); return; }
    // Validate at least one farmer has a name
    const validFarmers = farmerDrafts.filter(f => f.full_name.trim());
    if (validFarmers.length === 0) { setCreateError('Add at least one farmer with a name.'); return; }

    setCreateBusy(true); setCreateError('');
    try {
      // 1. Create the project
      const proj = await projectService.create({
        project_name: projectDraft.project_name.trim(),
        organisation: projectDraft.organisation.trim(),
        credit_type:  projectDraft.credit_type,
        total_amount_requested: projectDraft.total_amount_requested
          ? Number(projectDraft.total_amount_requested) : undefined,
        repayment_period_months: projectDraft.repayment_period_months
          ? Number(projectDraft.repayment_period_months) : undefined,
        purpose: projectDraft.purpose.trim(),
      });

      // 2. Add each farmer entry
      for (const farmer of validFarmers) {
        await projectService.addFarmer(proj.id, {
          ...farmer,
          amount_requested: farmer.amount_requested || null,
          farm_size_acres:  farmer.farm_size_acres  || null,
        });
      }

      // 3. Optionally submit
      if (submitAfter) {
        await projectService.submit(proj.id);
      }

      showMsg(submitAfter
        ? `Project "${proj.project_name}" created and submitted for review.`
        : `Project "${proj.project_name}" saved as draft.`
      );

      // Reset form and go back to list
      setProjectDraft(blankProject());
      setFarmerDrafts([blankFarmer()]);
      setCreateStep('details');
      setView('list');
      projects.refetch();

    } catch (err: any) {
      setCreateError(err?.response?.data?.detail ?? 'Failed to create project. Please try again.');
    } finally {
      setCreateBusy(false);
    }
  };

  const submitted = list.filter(p => ['submitted', 'under_review'].includes(p.status));
  const others    = list.filter(p => !['submitted', 'under_review'].includes(p.status));

  // ══════════════════════════════════════════════════════════════
  // CREATE VIEW
  // ══════════════════════════════════════════════════════════════
  if (view === 'create') {
    return (
      <div>
        <PageHeader
          title="New Project Application"
          subtitle="Create a group credit application on behalf of a partner organisation."
        />

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-lg)' }}>
          {(['details', 'farmers'] as const).map((step, i) => (
            <button
              key={step}
              onClick={() => setCreateStep(step)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                background: createStep === step ? 'var(--col-primary)' : 'var(--col-surface)',
                color: createStep === step ? '#fff' : 'var(--col-muted)',
                boxShadow: createStep === step ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {i + 1}. {step === 'details' ? 'Project Details' : `Farmer Entries (${farmerDrafts.length})`}
            </button>
          ))}
          <button
            onClick={() => setView('list')}
            style={{
              marginLeft: 'auto', padding: '8px 14px', borderRadius: 8,
              border: '1px solid var(--col-border)', background: 'none',
              cursor: 'pointer', fontSize: 13, color: 'var(--col-muted)',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <X size={14} /> Cancel
          </button>
        </div>

        {createError && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 'var(--sp-md)',
            background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 14,
          }}>
            {createError}
          </div>
        )}

        {/* ── STEP 1: Project Details ── */}
        {createStep === 'details' && (
          <Card>
            <SectionTitle>Project Details</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
              <div className="form-field">
                <label>Project Name <span className="required">*</span></label>
                <input type="text" placeholder="e.g. Tamale Broiler Initiative 2025"
                  value={projectDraft.project_name}
                  onChange={e => setProjectDraft(p => ({ ...p, project_name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Organisation / Partner Name <span className="required">*</span></label>
                <input type="text" placeholder="e.g. Savannah Farmers Cooperative"
                  value={projectDraft.organisation}
                  onChange={e => setProjectDraft(p => ({ ...p, organisation: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Credit Type <span className="required">*</span></label>
                <select value={projectDraft.credit_type}
                  onChange={e => setProjectDraft(p => ({ ...p, credit_type: e.target.value }))}>
                  {CREDIT_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Repayment Period (months)</label>
                <input type="number" min={1} max={60} placeholder="e.g. 12"
                  value={projectDraft.repayment_period_months}
                  onChange={e => setProjectDraft(p => ({ ...p, repayment_period_months: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Total Amount Requested (GHS)</label>
                <input type="number" min={0} placeholder="Will be auto-summed from farmer entries if left blank"
                  value={projectDraft.total_amount_requested}
                  onChange={e => setProjectDraft(p => ({ ...p, total_amount_requested: e.target.value }))} />
              </div>
            </div>
            <div className="form-field">
              <label>Purpose / Project Description <span className="required">*</span></label>
              <textarea rows={4} placeholder="Describe the project objectives, target beneficiaries, and expected outcomes…"
                value={projectDraft.purpose}
                onChange={e => setProjectDraft(p => ({ ...p, purpose: e.target.value }))} />
            </div>
            <Button onClick={() => setCreateStep('farmers')} style={{ marginTop: 'var(--sp-sm)' }}>
              Next: Add Farmers →
            </Button>
          </Card>
        )}

        {/* ── STEP 2: Farmer Entries ── */}
        {createStep === 'farmers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-md)' }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--col-muted)' }}>
                Add all farmers covered under this project. Each farmer can have their own credit amount.
              </p>
              <button
                onClick={addFarmerRow}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--col-primary)',
                  background: 'none', color: 'var(--col-primary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                <UserPlus size={14} /> Add Farmer
              </button>
            </div>

            {farmerDrafts.map((farmer, idx) => (
              <Card key={idx} style={{ marginBottom: 'var(--sp-sm)', position: 'relative' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 'var(--sp-sm)',
                }}>
                  <strong style={{ fontSize: 13 }}>Farmer {idx + 1}{farmer.full_name ? ` — ${farmer.full_name}` : ''}</strong>
                  {farmerDrafts.length > 1 && (
                    <button onClick={() => removeFarmerRow(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Full Name <span className="required">*</span></label>
                    <input type="text" placeholder="Farmer full name"
                      value={farmer.full_name}
                      onChange={e => updateFarmer(idx, 'full_name', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Phone (MoMo)</label>
                    <input type="tel" placeholder="024XXXXXXX"
                      value={farmer.phone}
                      onChange={e => updateFarmer(idx, 'phone', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Ghana Card No.</label>
                    <input type="text" placeholder="GHA-XXXXXXXXX-X"
                      value={farmer.ghana_card_number}
                      onChange={e => updateFarmer(idx, 'ghana_card_number', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Community</label>
                    <input type="text" placeholder="Community name"
                      value={farmer.community}
                      onChange={e => updateFarmer(idx, 'community', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>District</label>
                    <input type="text" placeholder="District"
                      value={farmer.district}
                      onChange={e => updateFarmer(idx, 'district', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Region</label>
                    <select value={farmer.region}
                      onChange={e => updateFarmer(idx, 'region', e.target.value)}>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Farm Name</label>
                    <input type="text" placeholder="Farm name"
                      value={farmer.farm_name}
                      onChange={e => updateFarmer(idx, 'farm_name', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Flock Type</label>
                    <select value={farmer.flock_type}
                      onChange={e => updateFarmer(idx, 'flock_type', e.target.value)}>
                      {FLOCK_TYPES.map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Flock Size (birds)</label>
                    <input type="number" min={0} placeholder="500"
                      value={farmer.flock_size || ''}
                      onChange={e => updateFarmer(idx, 'flock_size', Number(e.target.value))} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Farm Size (acres)</label>
                    <input type="number" min={0} step="0.1" placeholder="2.5"
                      value={farmer.farm_size_acres || ''}
                      onChange={e => updateFarmer(idx, 'farm_size_acres', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Amount Requested (GHS)</label>
                    <input type="number" min={0} placeholder="5000"
                      value={farmer.amount_requested || ''}
                      onChange={e => updateFarmer(idx, 'amount_requested', e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0, gridColumn: 'span 2' }}>
                    <label>Notes</label>
                    <input type="text" placeholder="Any additional notes about this farmer…"
                      value={farmer.notes}
                      onChange={e => updateFarmer(idx, 'notes', e.target.value)} />
                  </div>
                </div>
              </Card>
            ))}

            {/* Total summary */}
            {farmerDrafts.some(f => f.amount_requested) && (
              <div style={{
                padding: '12px 16px', borderRadius: 8, marginBottom: 'var(--sp-md)',
                background: 'var(--col-surface)', border: '1px solid var(--col-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 14, color: 'var(--col-muted)' }}>
                  {farmerDrafts.filter(f => f.full_name.trim()).length} farmers
                </span>
                <strong style={{ fontSize: 15 }}>
                  Total: GHS {farmerDrafts.reduce((sum, f) =>
                    sum + (Number(f.amount_requested) || 0), 0).toLocaleString()}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 'var(--sp-sm)' }}>
              <Button
                onClick={() => handleCreate(false)}
                disabled={createBusy}
                style={{ background: 'var(--col-surface)', color: 'var(--col-text)', border: '1px solid var(--col-border)' }}
              >
                {createBusy ? 'Saving…' : '💾 Save as Draft'}
              </Button>
              <Button
                onClick={() => handleCreate(true)}
                disabled={createBusy}
              >
                {createBusy ? 'Submitting…' : <><Send size={14} style={{ marginRight: 6 }} />Submit for Review</>}
              </Button>
              <button
                onClick={() => setCreateStep('details')}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: '1px solid var(--col-border)',
                  background: 'none', cursor: 'pointer', fontSize: 13,
                  color: 'var(--col-muted)', fontFamily: 'inherit',
                }}
              >
                ← Back to Details
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════
  return (
    <div>
      <PageHeader
        title="Project Applications"
        subtitle="Organisation-based group credit applications."
        action={
          <Button onClick={() => { setView('create'); setCreateStep('details'); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> New Project
          </Button>
        }
      />

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

      {/* Pending review section */}
      {submitted.length > 0 && (
        <>
          <SectionTitle>Pending Review ({submitted.length})</SectionTitle>
          {submitted.map(proj => (
            <ProjectCard key={proj.id} proj={proj}
              expanded={expandedId === proj.id}
              onToggle={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
              onAction={openAction} busy={busy === proj.id} />
          ))}
        </>
      )}

      {/* Approve/Reject modal */}
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

      {/* All projects */}
      <SectionTitle style={{ marginTop: 'var(--sp-lg)' }}>All Projects ({list.length})</SectionTitle>
      {projects.loading ? (
        <p style={{ color: 'var(--col-muted)', fontSize: 14 }}>Loading…</p>
      ) : list.length === 0 ? (
        <Card>
          <div style={{ padding: 'var(--sp-lg)', textAlign: 'center' }}>
            <p style={{ color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>No project applications yet.</p>
            <Button onClick={() => setView('create')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Create First Project
            </Button>
          </div>
        </Card>
      ) : (
        others.concat(submitted).map(proj => (
          <ProjectCard key={proj.id} proj={proj}
            expanded={expandedId === proj.id}
            onToggle={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
            onAction={openAction} busy={busy === proj.id} />
        ))
      )}
    </div>
  );
}

// ── Project Card (review list) ──────────────────────────────────────────────
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
            {proj.organisation} · {proj.submitted_by_name ?? 'Admin'} · {proj.farmer_count} farmer{proj.farmer_count !== 1 ? 's' : ''}
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
          <button onClick={onToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--sp-md)', borderTop: '1px solid var(--col-border)', paddingTop: 'var(--sp-md)' }}>
          <p style={{ fontSize: 14, marginBottom: 'var(--sp-sm)' }}><strong>Purpose:</strong> {proj.purpose}</p>
          {proj.rejection_reason && (
            <p style={{ fontSize: 14, color: 'var(--col-danger)' }}><strong>Rejection:</strong> {proj.rejection_reason}</p>
          )}
          {proj.reviewer_notes && (
            <p style={{ fontSize: 14 }}><strong>Notes:</strong> {proj.reviewer_notes}</p>
          )}

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
