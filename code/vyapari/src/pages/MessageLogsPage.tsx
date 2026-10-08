import { useNotificationContext } from '../context/NotificationContext';
import { format } from 'date-fns';

export const MessageLogsPage = () => {
  const { messageLogs } = useNotificationContext();

  const sorted = [...messageLogs].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return (
    <div style={{ padding: 'var(--spacing-32)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      <div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>Message Logs</h1>
        <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>History of sent messages and notifications</p>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
              <th style={{ padding: 16 }}>Sent At</th>
              <th style={{ padding: 16 }}>Recipient</th>
              <th style={{ padding: 16 }}>Channel</th>
              <th style={{ padding: 16 }}>Content</th>
              <th style={{ padding: 16 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 16, color: 'var(--color-muted-text)', fontSize: 14 }}>{format(new Date(log.sentAt), 'MMM d, h:mm a')}</td>
                <td style={{ padding: 16 }}>{log.recipient}</td>
                <td style={{ padding: 16, textTransform: 'capitalize' }}>{log.channel || 'system'}</td>
                <td style={{ padding: 16, fontSize: 14 }}>{log.content}</td>
                <td style={{ padding: 16 }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontSize: 12, 
                    fontWeight: 500,
                    backgroundColor: log.status === 'delivered' ? '#e6f4ea' : log.status === 'failed' ? '#fce8e6' : '#fef7e0',
                    color: log.status === 'delivered' ? '#137333' : log.status === 'failed' ? '#c5221f' : '#b06000'
                  }}>
                    {log.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-text)' }}>No messages sent yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
