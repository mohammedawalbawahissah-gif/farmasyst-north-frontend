import { PageHeader, Card, Badge, Button } from '../../components/ui';
import { toArray } from '../../lib/api';
import { useAsync } from '../../lib/hooks/useAsync';
import { marketplaceService } from '../../lib/services/marketplace';
import './consumer.css';

const ORDER_BADGE: Record<string,'success'|'warning'|'info'|'danger'|'neutral'> = {
  delivered:'success', confirmed:'info', dispatched:'info', pending:'warning', cancelled:'danger',
};

export default function Orders() {
  const orders = useAsync(() => marketplaceService.listOrders(), []);

  const handleCancel = async (id: string) => {
    try { await marketplaceService.cancelOrder(id); orders.refetch(); }
    catch { /* noop */ }
  };

  const all = toArray(orders.data);

  return (
    <div>
      <PageHeader title="My Orders" subtitle="Track all your poultry produce orders." />
      <Card>
        {orders.loading
          ? <p style={{padding:'var(--sp-md)',color:'var(--col-muted)'}}>Loading orders…</p>
          : all.length === 0
          ? <p style={{padding:'var(--sp-lg)',color:'var(--col-muted)',textAlign:'center'}}>No orders yet. Browse the marketplace to place your first order.</p>
          : (
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Amount</th><th>Status</th><th>Delivery Address</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {all.map(o => (
                  <tr key={o.id}>
                    <td className="data-table__mono">{o.id.slice(0,8)}…</td>
                    <td><strong>GHS {parseFloat(o.total_amount).toLocaleString()}</strong></td>
                    <td><Badge variant={ORDER_BADGE[o.status]}>{o.status}</Badge></td>
                    <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{o.delivery_address || '—'}</td>
                    <td className="data-table__muted">{new Date(o.created_at).toLocaleDateString('en-GH')}</td>
                    <td>
                      {['pending','confirmed'].includes(o.status)
                        ? <Button size="sm" variant="danger" onClick={()=>handleCancel(o.id)}>Cancel</Button>
                        : <span className="data-table__muted">—</span>}
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