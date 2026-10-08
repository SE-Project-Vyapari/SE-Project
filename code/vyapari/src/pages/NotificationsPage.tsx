import { useNotificationContext } from '../context/NotificationContext';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { Check, CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';

export const NotificationsPage = () => {
  const { notifications, markAllRead, markAsRead } = useNotificationContext();

  // Sort notifications by date desc
  const sorted = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info size={20} color="var(--color-primary)" />;
      case 'warning': return <AlertTriangle size={20} color="orange" />;
      case 'alert': return <XCircle size={20} color="red" />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div style={{ padding: 'var(--spacing-32)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>Notifications</h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>View and manage your alerts</p>
        </div>
        <Button onClick={markAllRead} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <CheckCircle2 size={16} style={{ marginRight: 8 }} /> Mark All as Read
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-text)' }}>No notifications</div>
        ) : (
          sorted.map(n => (
            <div key={n.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: 16, 
              backgroundColor: n.read ? 'var(--color-surface)' : 'var(--color-surface-hover, #f0f4ff)', 
              borderRadius: 8,
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {getIcon(n.type)}
                <div>
                  <h4 style={{ margin: '0 0 4px 0' }}>{n.title}</h4>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted-text)' }}>{n.message}</p>
                  <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                </div>
              </div>
              {!n.read && (
                <Button onClick={() => markAsRead(n.id)} style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                  <Check size={14} style={{ marginRight: 4 }} /> Mark Read
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
