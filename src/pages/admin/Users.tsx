import { useState } from 'react';
import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { adminService } from '../../lib/services/admin';
import { toArray } from '../../lib/api';
import { Search } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

const ROLE_BADGE: Record<string,'success'|'info'|'warning'|'neutral'> = {
  farmer:'success', investor:'info', admin:'warning', consumer:'neutral',
};

export default function AdminUsers() {
  const users = useAsync(() => adminService.listUsers(), []);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('');
  const [acting, setActing]   = useState<string|null>(null);
  const [msg, setMsg]         = useState('');

  const all = toArray(users.data).filter(u => {
    const s = search.toLowerCase();
    const matchSearch = !s || u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const [confirmDelete, setConfirmDelete] = useState<string|null>(null); // user id pending delete

  const handle = async (action: 'verify'|'suspend'|'delete', id: string) => {
    setActing(id); setMsg('');
    try {
      if (action === 'verify')  await adminService.verifyUser(id);
      if (action === 'suspend') await adminService.suspendUser(id);
      if (action === 'delete')  await adminService.deleteUser(id);
      setMsg(
        action === 'verify'  ? 'User verified and activated.' :
        action === 'suspend' ? 'User suspended.' :
                               'User deleted permanently.'
      );
      users.refetch();
    } catch { setMsg('Action failed.'); }
    finally { setActing(null); setConfirmDelete(null); }
  };

  return (
    <div>
      <PageHeader title="User Management" subtitle="Verify, manage, and monitor all platform users." />
      {msg && <p className="form-success" style={{marginBottom:'var(--sp-md)'}}>{msg}</p>}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (() => {
        const u = toArray(users.data).find(x => x.id === confirmDelete);
        return (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
          }}>
            <div style={{
              background:'#fff', borderRadius:10, padding:'var(--sp-xl)',
              maxWidth:420, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
            }}>
              <h3 style={{marginBottom:8, color:'var(--col-danger)'}}>Delete User</h3>
              <p style={{marginBottom:'var(--sp-md)', fontSize:14}}>
                Are you sure you want to permanently delete{' '}
                <strong>{u?.full_name}</strong> ({u?.email})?{' '}
                <span style={{color:'var(--col-danger)'}}>This cannot be undone.</span>
              </p>
              <div style={{display:'flex', gap:'var(--sp-sm)', justifyContent:'flex-end'}}>
                <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  disabled={acting === confirmDelete}
                  onClick={() => handle('delete', confirmDelete)}
                >
                  {acting === confirmDelete ? 'Deleting…' : 'Yes, delete'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display:'flex', gap:'var(--sp-sm)', marginBottom:'var(--sp-lg)', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:220 }}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--col-muted)'}} />
          <input style={{paddingLeft:32,width:'100%'}} placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={e=>setRole(e.target.value)} style={{minWidth:140}}>
          <option value="">All roles</option>
          {['farmer','investor','consumer','admin'].map(r=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <Card>
        {users.loading
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading users…</p>
          : all.length === 0
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>No users match your filters.</p>
          : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {all.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td className="data-table__muted">{u.email}</td>
                    <td><Badge variant={ROLE_BADGE[u.role]}>{u.role}</Badge></td>
                    <td>{u.is_verified
                      ? <Badge variant="success">Verified</Badge>
                      : u.is_active === false
                        ? <Badge variant="danger">Pending Activation</Badge>
                        : <Badge variant="neutral">Pending</Badge>
                    }</td>
                    <td className="data-table__muted">{new Date(u.date_joined).toLocaleDateString('en-GH')}</td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {!u.is_verified && <Button size="sm" disabled={acting===u.id} onClick={()=>handle('verify',u.id)}>Verify</Button>}
                        <Button size="sm" variant="danger" disabled={acting===u.id} onClick={()=>handle('suspend',u.id)}>Suspend</Button>
                        <Button size="sm" variant="danger" disabled={acting===u.id} onClick={()=>setConfirmDelete(u.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  );
}