import { PageHeader, Card, Button, Badge } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { notificationsService } from '../../lib/services/notifications';
import { Bell } from 'lucide-react';
import type { Notification } from '../../types';
import '../farmer/farmer.css';

export default function InputDealerNotifications() {
  const notifs = useAsync(() => notificationsService.list(), []);
  const list   = toArray<Notification>(notifs.data);
  const unread = list.filter(n => !n.is_read).length;
  const handleMarkAll = async () => { await notificationsService.markAllRead(); notifs.refetch(); };
  const handleRead    = async (id: string) => { await notificationsService.markRead(id); notifs.refetch(); };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Order updates and platform alerts."
        action={unread > 0 ? <Button size="sm" variant="secondary" onClick={handleMarkAll}>Mark all read</Button> : undefined} />
      {notifs.loading ? <p style={{color:'var(--col-muted)'}}>Loading…</p>
      : list.length === 0 ? (
        <Card style={{textAlign:'center',padding:'3rem'}}><Bell size={32} style={{opacity:.3,marginBottom:'1rem'}}/><p style={{color:'var(--col-muted)'}}>No notifications yet.</p></Card>
      ) : list.map(n => (
        <Card key={n.id} style={{marginBottom:'var(--sp-sm)',opacity:n.is_read?.65:1,borderLeft:n.is_read?undefined:'3px solid var(--col-primary)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'var(--sp-md)'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'var(--sp-sm)',marginBottom:4}}>
                <strong style={{fontSize:14}}>{n.title}</strong>
                {!n.is_read && <Badge variant="info">New</Badge>}
              </div>
              <p style={{fontSize:13,color:'var(--col-muted)',margin:0}}>{n.message}</p>
              <span style={{fontSize:12,color:'var(--col-muted)',marginTop:4,display:'block'}}>{new Date(n.created_at).toLocaleString('en-GH')}</span>
            </div>
            {!n.is_read && <Button size="sm" variant="secondary" onClick={()=>handleRead(n.id)}>Dismiss</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}
