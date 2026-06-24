import { useState } from 'react';
import { PageHeader, Card, Button, Badge, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { projectService, type ProjectApplication, type ProjectFarmerEntry } from '../../lib/services/projects';
import { toArray } from '../../lib/api';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import '../farmer/farmer.css';
import './investor.css';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  draft:        'neutral',
  submitted:    'info',
  under_review: 'warning',
  approved:     'success',
  rejected:     'danger',
  disbursed:    'success',
  withdrawn:    'neutral',
};

const CREDIT_TYPES = [
  { value: 'funding',  label: 'Funding' },
  { value: 'inputs',   label: 'Farm Inputs' },
  { value: 'training', label: 'Training Enrolment' },
];

const FLOCK_TYPES = [
  'broilers','layers','guinea_fowl','turkey','duck','geese','local_birds','mixed','hatchery',
];

const BLANK_FARMER: Omit<ProjectFarmerEntry, 'id' | 'project' | 'created_at'> = {
  farmer_account: null, full_name: '', phone: '', ghana_card_number: '',
  district: '', region: '', community: '', farm_name: '', flock_type: '',
  flock_size: 0, farm_size_acres: null, amount_requested: null, notes: '',
};

export default function ProjectApplications() {
  const projects = useAsync(() => projectService.list(), []);
  const list = toArray<ProjectApplication>(projects.data);

  const [creating,    setCreating]    = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);
  const [msg,         setMsg]         = useState('');
  const [msgType,     setMsgType]     = useState<'success'|'error'>('success');

  // New project form
  const [projectName, setProjectName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [creditType,   setCreditType]   = useState('funding');
  const [purpose,      setPurpose]      = useState('');
  const [totalAmt,     setTotalAmt]     = useState('');
  const [months,       setMonths]       = useState('');

  // Farmer entries for new project
  const [farmers, setFarmers] = useState<typeof BLANK_FARMER[]>([{ ...BLANK_FARMER }]);

  const resetForm = () => {
    setProjectName(''); setOrganisation(''); setCreditType('funding');
    setPurpose(''); setTotalAmt(''); setMonths('');
    setFarmers([{ ...BLANK_FARMER }]);
  };

  const updateFarmer = (idx: number, field: string, value: any) => {
    setFarmers(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const handleCreate = async () => {
    if (!projectName.trim() || !organisation.trim() || !purpose.trim()) {
      setMsg('Please fill in Project Name, Organisation, and Purpose.'); setMsgType('error'); return;
    }
    if (farmers.some(f => !f.full_name.trim())) {
      setMsg('Each farmer entry must have a full name.'); setMsgType('error'); return;
    }
    setBusy(true); setMsg('');
    try {
      const project = await projectService.create({
        project_name: projectName.trim(),
        organisation: organisation.trim(),
        credit_type: creditType,
        purpose: purpose.trim(),
        ...(totalAmt && { total_amount_requested: parseFloat(totalAmt) }),
        ...(months   && { repayment_period_months: parseInt(months) }),
      });
      // Add all farmer entries
      for (const f of farmers) {
        await projectService.addFarmer(project.id, f);
      }
      // Auto-submit
      await projectService.submit(project.id);
      setMsg('Project application submitted successfully!'); setMsgType('success');
      setCreating(false);
      resetForm();
      projects.refetch();
    } catch (err: any) {
      setMsg(err?.response?.data?.detail ?? 'Failed to submit project application.');
      setMsgType('error');
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    setBusy(true);
    try {
      await projectService.withdraw(id);
      projects.refetch();
    } catch {
      setMsg('Withdraw failed.'); setMsgType('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Project Applications"
        subtitle="Apply for group credit on behalf of farmers under your organisation."
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

      {/* Create button */}
      {!creating && (
        <div style={{ marginBottom: 'var(--sp-md)' }}>
          <Button onClick={() => { setCreating(true); setMsg(''); }}>
            <Plus size={15} style={{ marginRight: 6 }} /> New Project Application
          </Button>
        </div>
      )}

      {/* ── Create Form ── */}
      {creating && (
        <Card style={{ marginBottom: 'var(--sp-lg)' }}>
          <SectionTitle>New Project Application</SectionTitle>
          <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>
            Fill in project details, then add all farmers under this project. The application will be submitted to FarmAsyst North for review.
          </p>

          <div className="form-row">
            <div className="form-field">
              <label>Project Name <span className="required">*</span></label>
              <input type="text" placeholder="e.g. Tamale Broiler Scale-Up Project 2025"
                value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Organisation <span className="required">*</span></label>
              <input type="text" placeholder="e.g. Northern Poultry Cooperative"
                value={organisation} onChange={e => setOrganisation(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Credit Type <span className="required">*</span></label>
              <select value={creditType} onChange={e => setCreditType(e.target.value)}>
                {CREDIT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Total Amount Requested (GHS)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 50000"
                value={totalAmt} onChange={e => setTotalAmt(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Repayment Period (months)</label>
              <input type="number" min="1" placeholder="e.g. 12"
                value={months} onChange={e => setMonths(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Project Purpose <span className="required">*</span></label>
            <textarea rows={3} placeholder="Describe the purpose of this group credit application…"
              value={purpose} onChange={e => setPurpose(e.target.value)} />
          </div>

          {/* Farmer Entries */}
          <div style={{ borderTop: '1px solid var(--col-border)', paddingTop: 'var(--sp-md)', marginTop: 'var(--sp-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-sm)' }}>
              <SectionTitle style={{ margin: 0 }}>Farmers ({farmers.length})</SectionTitle>
              <Button onClick={() => setFarmers(prev => [...prev, { ...BLANK_FARMER }])} style={{ fontSize: 13, padding: '6px 14px' }}>
                <Plus size={13} style={{ marginRight: 4 }} /> Add Farmer
              </Button>
            </div>

            {farmers.map((f, idx) => (
              <div key={idx} style={{ padding: 'var(--sp-md)', borderRadius: 10, border: '1px solid var(--col-border)', marginBottom: 'var(--sp-sm)', position: 'relative', background: 'var(--col-surface-raised, #fafafa)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
                  <strong style={{ fontSize: 13 }}>Farmer {idx + 1}</strong>
                  {farmers.length > 1 && (
                    <button onClick={() => setFarmers(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Full Name <span className="required">*</span></label>
                    <input type="text" placeholder="Farmer's full name" value={f.full_name}
                      onChange={e => updateFarmer(idx, 'full_name', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Phone</label>
                    <input type="tel" placeholder="024XXXXXXX" value={f.phone}
                      onChange={e => updateFarmer(idx, 'phone', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Ghana Card No.</label>
                    <input type="text" placeholder="GHA-XXXXXXXXX-X" value={f.ghana_card_number}
                      onChange={e => updateFarmer(idx, 'ghana_card_number', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Region</label>
                    <input type="text" placeholder="e.g. Northern" value={f.region}
                      onChange={e => updateFarmer(idx, 'region', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>District</label>
                    <input type="text" placeholder="e.g. Tamale Metro" value={f.district}
                      onChange={e => updateFarmer(idx, 'district', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Community</label>
                    <input type="text" placeholder="e.g. Builsa" value={f.community}
                      onChange={e => updateFarmer(idx, 'community', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Farm Name</label>
                    <input type="text" placeholder="e.g. Abubakar Poultry Farm" value={f.farm_name}
                      onChange={e => updateFarmer(idx, 'farm_name', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Flock Type</label>
                    <select value={f.flock_type} onChange={e => updateFarmer(idx, 'flock_type', e.target.value)}>
                      <option value="">Select</option>
                      {FLOCK_TYPES.map(ft => <option key={ft} value={ft}>{ft.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Flock Size</label>
                    <input type="number" min="0" placeholder="0" value={f.flock_size || ''}
                      onChange={e => updateFarmer(idx, 'flock_size', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Amount (GHS)</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={f.amount_requested ?? ''}
                      onChange={e => updateFarmer(idx, 'amount_requested', e.target.value || null)} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Notes</label>
                  <input type="text" placeholder="Any additional notes for this farmer"
                    value={f.notes} onChange={e => updateFarmer(idx, 'notes', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'var(--sp-md)' }}>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? 'Submitting…' : '📨 Submit Project Application'}
            </Button>
            <Button onClick={() => { setCreating(false); resetForm(); setMsg(''); }}
              style={{ background: 'var(--col-surface)', color: 'var(--col-text)', border: '1px solid var(--col-border)' }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Project List ── */}
      <SectionTitle>My Project Applications</SectionTitle>
      {projects.loading ? (
        <p style={{ color: 'var(--col-muted)', fontSize: 14 }}>Loading…</p>
      ) : list.length === 0 ? (
        <Card><p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No project applications yet. Click "New Project Application" to start.</p></Card>
      ) : list.map(proj => (
        <Card key={proj.id} style={{ marginBottom: 'var(--sp-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 15 }}>{proj.project_name}</strong>
                <Badge variant={STATUS_VARIANT[proj.status] ?? 'neutral'}>{proj.status.replace(/_/g, ' ')}</Badge>
                <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>{proj.reference}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--col-muted)' }}>
                {proj.organisation} · {proj.farmer_count} farmer{proj.farmer_count !== 1 ? 's' : ''} · {proj.credit_type.replace(/_/g, ' ')}
                {proj.total_amount_requested ? ` · GHS ${Number(proj.total_amount_requested).toLocaleString()}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {proj.status === 'draft' && (
                <button onClick={() => handleWithdraw(proj.id)} disabled={busy}
                  style={{ fontSize: 12, color: 'var(--col-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Withdraw
                </button>
              )}
              <button onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)' }}>
                {expandedId === proj.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {expandedId === proj.id && (
            <div style={{ marginTop: 'var(--sp-md)', borderTop: '1px solid var(--col-border)', paddingTop: 'var(--sp-md)' }}>
              <p style={{ fontSize: 14, marginBottom: 'var(--sp-sm)' }}><strong>Purpose:</strong> {proj.purpose}</p>
              {proj.rejection_reason && (
                <p style={{ fontSize: 14, color: 'var(--col-danger)' }}><strong>Rejection reason:</strong> {proj.rejection_reason}</p>
              )}
              {proj.reviewer_notes && (
                <p style={{ fontSize: 14 }}><strong>Reviewer notes:</strong> {proj.reviewer_notes}</p>
              )}

              <SectionTitle>Farmer Entries</SectionTitle>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Phone</th><th>District</th><th>Region</th>
                      <th>Farm</th><th>Flock Type</th><th>Flock Size</th><th>Amount (GHS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proj.farmer_entries.map(fe => (
                      <tr key={fe.id}>
                        <td><strong>{fe.full_name}</strong></td>
                        <td>{fe.phone || '—'}</td>
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
      ))}
    </div>
  );
}
