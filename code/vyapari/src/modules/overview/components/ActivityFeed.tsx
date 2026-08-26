import { useStore } from '../../../services/store';
import { Card } from '../../../components/ui/Card';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, ShoppingCart, Package, AlertCircle } from 'lucide-react';

export const ActivityFeed = () => {
  const store = useStore();
  
  // Get last 10 audit events, sorted by newest
  const recentEvents = [...store.auditEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  const getIcon = (action: string) => {
    if (action.includes('SALE')) return <ShoppingCart size={16} color="var(--color-primary)" />;
    if (action.includes('INVENTORY')) return <Package size={16} color="var(--color-warning)" />;
    if (action.includes('ERROR')) return <AlertCircle size={16} color="var(--color-danger)" />;
    return <CheckCircle2 size={16} color="var(--color-success)" />;
  };

  return (
    <Card style={{ padding: 'var(--spacing-24)', gridRow: 'span 2' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Recent Activity</h3>
      
      {recentEvents.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-text)' }}>
          No recent activity.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {recentEvents.map(event => (
            <div key={event.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 2 }}>{getIcon(event.action)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 2 }}>
                  {event.details || event.action}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })} • by User {event.actorId.slice(-4)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
