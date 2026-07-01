import { useState } from 'react';
import { PageHeader, Card, Button, SectionTitle } from '../../components/ui';
import { useAuth } from '../../lib/hooks/useAuth';
import { authService } from '../../lib/services/auth';
import './admin.css';

export default function AdminSettings() {
  const { user } = useAuth();
  const [oldPw, setOld]   = useState('');
  const [newPw, setNew]   = useState('');
  const [saving, setSave] = useState(false);
  const [msg, setMsg]     = useState('');
  const [err, setErr]     = useState('');

  const handlePw = async () => {
    if (!oldPw || !newPw) return;
    setSave(true); setMsg(''); setErr('');
    try {
      await authService.changePassword(oldPw, newPw);
      setMsg('Password updated successfully.'); setOld(''); setNew('');
    } catch { setErr('Password change failed. Check your current password.'); }
    finally { setSave(false); }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account and platform configuration." />

      <SectionTitle>Account Details</SectionTitle>
      <Card style={{ maxWidth: 500, marginBottom: 'var(--sp-xl)' }}>
        <div className="repayment-row"><span>Full name</span><strong>{user?.full_name}</strong></div>
        <div className="repayment-row"><span>Email</span><strong>{user?.email}</strong></div>
        <div className="repayment-row"><span>Role</span><strong style={{textTransform:'capitalize'}}>{user?.role}</strong></div>
        <div className="repayment-row"><span>Account verified</span><strong>{user?.is_verified ? 'Yes ✓' : 'No'}</strong></div>
        <div className="repayment-row"><span>Member since</span><strong>{user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-GH',{day:'numeric',month:'long',year:'numeric'}) : '—'}</strong></div>
      </Card>

      <SectionTitle>Change Password</SectionTitle>
      <Card style={{ maxWidth: 400 }}>
        {msg && <p className="form-success">{msg}</p>}
        {err && <p className="form-error">{err}</p>}
        <div className="form-field"><label>Current password</label><input type="password" value={oldPw} onChange={e=>setOld(e.target.value)} /></div>
        <div className="form-field"><label>New password</label><input type="password" value={newPw} onChange={e=>setNew(e.target.value)} /></div>
        <Button disabled={!oldPw||!newPw||saving} onClick={handlePw} style={{marginTop:'var(--sp-sm)'}}>
          {saving?'Updating…':'Update Password'}
        </Button>
      </Card>
    </div>
  );
}