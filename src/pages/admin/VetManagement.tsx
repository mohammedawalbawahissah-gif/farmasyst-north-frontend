import { useState, useMemo } from 'react';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { vetService } from '../../lib/services/vet';
import { toArray } from '../../lib/api';
import type { VetProfile } from '../../types';
import {
  CheckCircle, XCircle, Stethoscope, Search, X, Trash2,
  Phone, MapPin, CreditCard, RefreshCw,
} from 'lucide-react';
import './admin.css';

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning', approved: 'success', suspended: 'danger',
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended';
type Tab = 'pending' | 'all';

export default function AdminVetManagement() {
  const [tab, setTab]             = useState<Tab>('pending');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<StatusFilter>('all');
  const [acting, setActing]       = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [detail, setDetail]       = useState<VetProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const pending = useAsync(() => vetService.listPendingVets(), []);
  const all     = useAsync(() => vetService.listVets(), []);

  const base = tab === 'pending' ? toArray<VetProfile>(pending.data) : toArray<VetProfile>(all.data);

  const shown = useMemo(() => {
    let items = base;
    if (statusFilter !== 'all') items = items.filter(v => v.approval_status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(v =>
        v.user?.full_name?.toLowerCase().includes(q) ||
        v.clinic_name?.toLowerCase().includes(q) ||
        v.specialisation?.toLowerCase().includes(q) ||
        v.license_number?.toLowerCase().includes(q) ||
        v.region?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [base, statusFilter, search]);

  const refetchAll = () => { pending.refetch(); all.refetch(); };

  const flash = (msg: string, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { if (isErr) setError(''); else setSuccess(''); }, 4000);
  };

  const handleApprove = async (id: string) => {
    setActing(id);
    try { await vetService.approveVet(id); flash('Vet approved.'); refetchAll(); }
    catch { flash('Failed to approve vet.', true); }
    finally { setActing(null); }
  };

  const handleSuspend = async (id: string) => {
    setActing(id);
    try { await vetService.suspendVet(id); flash('Vet suspended.'); refetchAll(); }
    catch { flash('Failed to suspend vet.', true); }
    finally { setActing(null); }
  };

  const handleDelete = async (id: string) => {
    setActing(id); setConfirmDelete(null);
    try { await vetService.deleteVet(id); flash('Vet profile deleted.'); refetchAll(); }
    catch { flash('Failed to delete vet.', true); }
    finally { setActing(null); }
  };

  const loading = tab === 'pending' ? pending.loading : all.loading;

  return (
    <div>
      <PageHeader title="Veterinary Services" subtitle="Review and manage vet registrations." />

      {success && (
        <div style={{ background: 'var(--col-success-bg)', color: 'var(--col-success)', padding: 'var(--sp-sm) var(--sp-md)', borderRadius: 8, marginBottom: 'var(--sp-md)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          {success}<X size={14} style={{ cursor: 'pointer' }} onClick={() => setSuccess('')} />
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--col-danger-bg)', color: 'var(--col-danger)', padding: 'var(--sp-sm) var(--sp-md)', borderRadius: 8, marginBottom: 'var(--sp-md)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          {error}<X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="sm" variant={tab === 'pending' ? 'primary' : 'secondary'} onClick={() => { setTab('pending'); setStatus('all'); }}>
          Pending ({toArray<VetProfile>(pending.data).length})
        </Button>
        <Button size="sm" variant={tab === 'all' ? 'primary' : 'secondary'} onClick={() => { setTab('all'); setStatus('all'); }}>
          All Vets ({toArray<VetProfile>(all.data).length})
        </Button>
        <Button size="sm" variant="ghost" onClick={refetchAll} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Search + Status filter */}
      <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, clinic, licence…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px 7px 32px', border: '1px solid var(--col-border)',
              borderRadius: 6, fontSize: 13, background: 'var(--col-surface)',
              color: 'var(--col-text)',
            }}
          />
          {search && <X size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--col-muted)' }} onClick={() => setSearch('')} />}
        </div>
        {tab === 'all' && (
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value as StatusFilter)}
            style={{ padding: '7px 10px', border: '1px solid var(--col-border)', borderRadius: 6, fontSize: 13, background: 'var(--col-surface)', color: 'var(--col-text)' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
          </select>
        )}
      </div>

      {/* Results count */}
      <p style={{ fontSize: 12, color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>
        {loading ? 'Loading…' : `${shown.length} vet${shown.length !== 1 ? 's' : ''} found`}
      </p>

      {/* List */}
      {shown.length === 0 && !loading ? (
        <Card style={{ textAlign: 'center', padding: '3rem', color: 'var(--col-muted)' }}>
          <Stethoscope size={32} style={{ opacity: .3, marginBottom: '1rem' }} />
          <p>No {tab === 'pending' ? 'pending vet applications' : 'registered vets'} found.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
          {shown.map(v => (
            <Card key={v.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(v)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>Dr. {(v.user?.full_name ?? `${v.user?.first_name ?? ''} ${v.user?.last_name ?? ''}`.trim()) || '—'}</strong>
                    <Badge variant={STATUS_BADGE[v.approval_status]}>{v.approval_status}</Badge>
                    {v.is_available && <Badge variant="success">Available</Badge>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--col-muted)', margin: '2px 0' }}>
                    {v.clinic_name}{v.specialisation ? ` · ${v.specialisation}` : ''}
                  </p>
                  <p style={{ fontSize: 13, margin: '2px 0' }}>
                    <MapPin size={11} style={{ verticalAlign: 'middle' }} /> {[v.district, v.region].filter(Boolean).join(', ') || '—'}
                    {v.phone && <>&nbsp;·&nbsp;<Phone size={11} style={{ verticalAlign: 'middle' }} /> {v.phone}</>}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--col-muted)', margin: '2px 0' }}>
                    <CreditCard size={10} style={{ verticalAlign: 'middle' }} /> {v.license_number || '—'}
                    {v.consultation_fee && ` · Consult: GHS ${v.consultation_fee}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexShrink: 0 }} onClick={() => {}}>
                  {v.approval_status === 'pending' && (
                    <Button size="sm" onClick={() => handleApprove(String(v.id))} disabled={acting === String(v.id)}>
                      <CheckCircle size={13} /> Approve
                    </Button>
                  )}
                  {v.approval_status === 'approved' && (
                    <Button size="sm" variant="secondary" onClick={() => handleSuspend(String(v.id))} disabled={acting === String(v.id)}>
                      <XCircle size={13} /> Suspend
                    </Button>
                  )}
                  {v.approval_status === 'suspended' && (
                    <Button size="sm" onClick={() => handleApprove(String(v.id))} disabled={acting === String(v.id)}>
                      <CheckCircle size={13} /> Re-activate
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(String(v.id))} disabled={acting === String(v.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card style={{ maxWidth: 380, width: '90%', padding: 'var(--sp-lg)' }}>
            <h3 style={{ margin: '0 0 var(--sp-sm)', fontSize: 16 }}>Delete Vet Profile?</h3>
            <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>
              This will permanently remove the vet and all associated data. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', justifyContent: 'flex-end' }}>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(confirmDelete)}>Delete</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDetail(null)}>
          <Card style={{ maxWidth: 520, width: '95%', padding: 'var(--sp-lg)', maxHeight: '90vh', overflowY: 'auto' }} onClick={() => {}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-md)' }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>
                Dr. {detail.user?.full_name ?? `${detail.user?.first_name ?? ''} ${detail.user?.last_name ?? ''}`.trim()}
              </h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--col-muted)' }} onClick={() => setDetail(null)} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
              <Badge variant={STATUS_BADGE[detail.approval_status]}>{detail.approval_status}</Badge>
              {detail.is_available && <Badge variant="success">Available</Badge>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              {[
                ['Email',       detail.user?.email],
                ['Phone',       detail.phone || '—'],
                ['Clinic',      detail.clinic_name || '—'],
                ['Specialisation', detail.specialisation || '—'],
                ['Licence No.', detail.license_number || '—'],
                ['Region',      detail.region || '—'],
                ['District',    detail.district || '—'],
                ['Consult Fee', detail.consultation_fee ? `GHS ${detail.consultation_fee}` : '—'],
                ['Services',    detail.services_offered || '—'],
                ['Registered',  detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—'],
              ].map(([label, val]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--col-border)' }}>
                  <td style={{ padding: '7px 0', color: 'var(--col-muted)', width: 130 }}>{label}</td>
                  <td style={{ padding: '7px 0', wordBreak: 'break-word' }}>{val}</td>
                </tr>
              ))}
            </table>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 'var(--sp-md)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {detail.approval_status === 'pending' && (
                <Button size="sm" onClick={() => { handleApprove(String(detail.id)); setDetail(null); }} disabled={acting === String(detail.id)}>
                  <CheckCircle size={13} /> Approve
                </Button>
              )}
              {detail.approval_status === 'approved' && (
                <Button size="sm" variant="secondary" onClick={() => { handleSuspend(String(detail.id)); setDetail(null); }} disabled={acting === String(detail.id)}>
                  <XCircle size={13} /> Suspend
                </Button>
              )}
              {detail.approval_status === 'suspended' && (
                <Button size="sm" onClick={() => { handleApprove(String(detail.id)); setDetail(null); }} disabled={acting === String(detail.id)}>
                  <CheckCircle size={13} /> Re-activate
                </Button>
              )}
              <Button size="sm" variant="danger" onClick={() => { setDetail(null); setConfirmDelete(String(detail.id)); }}>
                <Trash2 size={13} /> Delete
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
