import { useState, useMemo } from 'react';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { inputDealerService } from '../../lib/services/inputDealer';
import { toArray } from '../../lib/api';
import type { InputDealerProfile } from '../../types';
import {
  CheckCircle, XCircle, Store, Search, X, Trash2,
  Phone, MapPin, Hash, RefreshCw, Tag,
} from 'lucide-react';
import './admin.css';

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning', approved: 'success', suspended: 'danger',
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended';
type Tab = 'pending' | 'all';

export default function AdminInputDealerManagement() {
  const [tab, setTab]             = useState<Tab>('pending');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<StatusFilter>('all');
  const [acting, setActing]       = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [detail, setDetail]       = useState<InputDealerProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const pending = useAsync(() => inputDealerService.listPendingDealers(), []);
  const all     = useAsync(() => inputDealerService.listDealers(), []);

  const base = tab === 'pending' ? toArray<InputDealerProfile>(pending.data) : toArray<InputDealerProfile>(all.data);

  const shown = useMemo(() => {
    let items = base;
    if (statusFilter !== 'all') items = items.filter(d => d.approval_status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(d =>
        d.business_name?.toLowerCase().includes(q) ||
        d.user?.full_name?.toLowerCase().includes(q) ||
        d.user?.first_name?.toLowerCase().includes(q) ||
        d.registration_number?.toLowerCase().includes(q) ||
        d.region?.toLowerCase().includes(q) ||
        (d.product_categories ?? []).some((c: string) => c.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [base, statusFilter, search]);

  const refetchAll = () => { pending.refetch(); all.refetch(); };

  const flash = (msg: string, isErr = false) => {
    isErr ? setError(msg) : setSuccess(msg);
    setTimeout(() => isErr ? setError('') : setSuccess(''), 4000);
  };

  const handleApprove = async (id: string) => {
    setActing(id);
    try { await inputDealerService.approveDealer(id); flash('Dealer approved.'); refetchAll(); }
    catch { flash('Failed to approve dealer.', true); }
    finally { setActing(null); }
  };

  const handleSuspend = async (id: string) => {
    setActing(id);
    try { await inputDealerService.suspendDealer(id); flash('Dealer suspended.'); refetchAll(); }
    catch { flash('Failed to suspend dealer.', true); }
    finally { setActing(null); }
  };

  const handleDelete = async (id: string) => {
    setActing(id); setConfirmDelete(null);
    try { await inputDealerService.deleteDealer(id); flash('Dealer profile deleted.'); refetchAll(); }
    catch { flash('Failed to delete dealer.', true); }
    finally { setActing(null); }
  };

  const loading = tab === 'pending' ? pending.loading : all.loading;

  return (
    <div>
      <PageHeader title="Farm Input Dealers" subtitle="Review and manage input dealer registrations." />

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
          Pending ({toArray<InputDealerProfile>(pending.data).length})
        </Button>
        <Button size="sm" variant={tab === 'all' ? 'primary' : 'secondary'} onClick={() => { setTab('all'); setStatus('all'); }}>
          All Dealers ({toArray<InputDealerProfile>(all.data).length})
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
            placeholder="Search by business, name, category…"
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
        {loading ? 'Loading…' : `${shown.length} dealer${shown.length !== 1 ? 's' : ''} found`}
      </p>

      {/* List */}
      {shown.length === 0 && !loading ? (
        <Card style={{ textAlign: 'center', padding: '3rem', color: 'var(--col-muted)' }}>
          <Store size={32} style={{ opacity: .3, marginBottom: '1rem' }} />
          <p>No {tab === 'pending' ? 'pending dealer applications' : 'registered dealers'} found.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
          {shown.map(d => (
            <Card key={d.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(d)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>{d.business_name || '—'}</strong>
                    <Badge variant={STATUS_BADGE[d.approval_status]}>{d.approval_status}</Badge>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--col-muted)', margin: '2px 0' }}>
                    Owner: {(d.user?.full_name ?? `${d.user?.first_name ?? ''} ${d.user?.last_name ?? ''}`.trim()) || '—'}
                    {d.phone && <>&nbsp;·&nbsp;<Phone size={11} style={{ verticalAlign: 'middle' }} /> {d.phone}</>}
                  </p>
                  <p style={{ fontSize: 13, margin: '2px 0' }}>
                    <MapPin size={11} style={{ verticalAlign: 'middle' }} /> {[d.district, d.region].filter(Boolean).join(', ') || '—'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--col-muted)', margin: '2px 0' }}>
                    <Hash size={10} style={{ verticalAlign: 'middle' }} /> {d.registration_number || 'No reg. number'}
                    {(d.product_categories?.length > 0) && (
                      <>&nbsp;·&nbsp;<Tag size={10} style={{ verticalAlign: 'middle' }} /> {d.product_categories.join(', ')}</>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexShrink: 0 }} onClick={() => {}}>
                  {d.approval_status === 'pending' && (
                    <Button size="sm" onClick={() => handleApprove(String(d.id))} disabled={acting === String(d.id)}>
                      <CheckCircle size={13} /> Approve
                    </Button>
                  )}
                  {d.approval_status === 'approved' && (
                    <Button size="sm" variant="secondary" onClick={() => handleSuspend(String(d.id))} disabled={acting === String(d.id)}>
                      <XCircle size={13} /> Suspend
                    </Button>
                  )}
                  {d.approval_status === 'suspended' && (
                    <Button size="sm" onClick={() => handleApprove(String(d.id))} disabled={acting === String(d.id)}>
                      <CheckCircle size={13} /> Re-activate
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(String(d.id))} disabled={acting === String(d.id)}>
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
            <h3 style={{ margin: '0 0 var(--sp-sm)', fontSize: 16 }}>Delete Dealer Profile?</h3>
            <p style={{ fontSize: 13, color: 'var(--col-muted)', marginBottom: 'var(--sp-md)' }}>
              This will permanently remove the dealer and all associated data. This action cannot be undone.
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
              <h2 style={{ margin: 0, fontSize: 17 }}>{detail.business_name}</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--col-muted)' }} onClick={() => setDetail(null)} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-md)', flexWrap: 'wrap' }}>
              <Badge variant={STATUS_BADGE[detail.approval_status]}>{detail.approval_status}</Badge>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              {[
                ['Owner',        (detail.user?.full_name ?? `${detail.user?.first_name ?? ''} ${detail.user?.last_name ?? ''}`.trim()) || '—'],
                ['Email',        detail.user?.email || '—'],
                ['Phone',        detail.phone || '—'],
                ['Reg. Number',  detail.registration_number || '—'],
                ['Region',       detail.region || '—'],
                ['District',     detail.district || '—'],
                ['Address',      detail.address || '—'],
                ['Categories',   detail.product_categories?.join(', ') || '—'],
                ['Registered',   detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—'],
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
