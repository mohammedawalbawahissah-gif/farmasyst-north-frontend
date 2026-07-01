import { PageHeader, Card, Button } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import './consumer.css';

export default function Subscriptions() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Set up regular supply orders from your favourite farms." />
      <Card style={{maxWidth:540,padding:'var(--sp-xl)',textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:'var(--sp-md)'}}>🔄</div>
        <h3 style={{marginBottom:'var(--sp-sm)'}}>Subscription Supply Orders</h3>
        <p style={{color:'var(--col-muted)',marginBottom:'var(--sp-lg)',fontSize:14}}>
          Set up weekly or monthly recurring orders from verified farms. This feature lets you lock in
          reliable supply at agreed prices — ideal for restaurants, caterers, and households.
        </p>
        <p style={{fontSize:13,color:'var(--col-muted)',marginBottom:'var(--sp-lg)'}}>
          Subscription contracts are managed through FarmAsyst North. Contact our team or browse
          the marketplace to find farms offering subscription plans.
        </p>
        <Button onClick={() => navigate('/consumer')}>Browse Marketplace</Button>
      </Card>
    </div>
  );
}