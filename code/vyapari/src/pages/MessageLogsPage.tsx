import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../context/NotificationContext';
import { useStore } from '../services/store';
import { sendMessage } from '../services/mockMessaging';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { RefreshCw, Send, Zap, ShieldAlert } from 'lucide-react';
import type { MessageStatus } from '../types';

export const MessageLogsPage = () => {
  const navigate = useNavigate();
  const { messageLogs, retryMessage } = useNotificationContext();
  const customers = useStore(state => state.customers);
  const products = useStore(state => state.products);

  const [simCustomerId, setSimCustomerId] = useState(customers[0]?.id || 'c-1');
  const [simChannel, setSimChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [simTemplate, setSimTemplate] = useState<'order.statusChanged' | 'churn.riskChanged'>(
    'order.statusChanged'
  );

  const sorted = [...messageLogs].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );

  const handleSimulateSend = async () => {
    const customer = customers.find(c => c.id === simCustomerId);
    if (!customer) return;
    await sendMessage(customer, simChannel, simTemplate, {
      customerName: customer.name,
      orderId: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 1250,
      outletName: 'Downtown Branch',
      favoriteProduct: products[0]?.name || 'Basmati Rice (5kg)',
    });
  };

  const getStatusChip = (status: MessageStatus) => {
    switch (status) {
      case 'queued':
        return {
          label: 'Queued',
          bg: '#f3f4f6',
          color: '#374151',
          pulse: true,
        };
      case 'sent':
        return {
          label: 'Sent',
          bg: '#e0f2fe',
          color: '#0369a1',
          pulse: true,
        };
      case 'delivered':
        return {
          label: 'Delivered',
          bg: '#dcfce7',
          color: '#166534',
          pulse: false,
        };
      case 'failed':
        return {
          label: 'Failed',
          bg: '#fee2e2',
          color: '#b91c1c',
          pulse: false,
        };
      case 'skipped':
        return {
          label: 'Skipped (not opted in)',
          bg: '#fef3c7',
          color: '#92400e',
          pulse: false,
        };
    }
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-32)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-24)',
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>Message Logs (Sandbox)</h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
            Simulated WhatsApp &amp; SMS delivery states (Queued → Sent → Delivered / Failed / Skipped)
          </p>
        </div>
        <Button
          onClick={() => navigate('/notifications/automation')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <Zap size={16} style={{ marginRight: 6 }} /> Automation Rules
        </Button>
      </div>

      {/* Interactive Sandbox Trigger Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
          padding: 16,
          backgroundColor: 'var(--color-surface)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Test Customer (Opt-In Check)</label>
          <select
            value={simCustomerId}
            onChange={e => setSimCustomerId(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
            }}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} (
                {c.optInForMessages === false || c.optedIn === false ? 'Opted Out' : 'Opted In'})
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 140, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Channel</label>
          <select
            value={simChannel}
            onChange={e => setSimChannel(e.target.value as 'whatsapp' | 'sms')}
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
            }}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Template</label>
          <select
            value={simTemplate}
            onChange={e =>
              setSimTemplate(e.target.value as 'order.statusChanged' | 'churn.riskChanged')
            }
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
            }}
          >
            <option value="order.statusChanged">Order Ready Notification</option>
            <option value="churn.riskChanged">Customer Retention Offer</option>
          </select>
        </div>
        <Button
          onClick={handleSimulateSend}
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          <Send size={14} style={{ marginRight: 6 }} /> Simulate Send
        </Button>
      </div>

      {/* Message Logs Table */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                fontSize: 13,
              }}
            >
              <th style={{ padding: 14 }}>Timestamp</th>
              <th style={{ padding: 14 }}>Recipient</th>
              <th style={{ padding: 14 }}>Channel</th>
              <th style={{ padding: 14 }}>Template &amp; Message</th>
              <th style={{ padding: 14 }}>Delay</th>
              <th style={{ padding: 14 }}>Status</th>
              <th style={{ padding: 14, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(log => {
              const chip = getStatusChip(log.status);
              return (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor:
                      log.status === 'failed' ? 'rgba(220, 38, 38, 0.03)' : 'transparent',
                  }}
                >
                  <td style={{ padding: 14, color: 'var(--color-muted-text)', fontSize: 13 }}>
                    {format(new Date(log.sentAt), 'MMM d, h:mm:ss a')}
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {log.recipientName || log.recipient}
                    </div>
                    {log.recipientName && log.recipientName !== log.recipient && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                        {log.recipient}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 14, textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>
                    {log.channel || 'whatsapp'}
                  </td>
                  <td style={{ padding: 14, maxWidth: 360 }}>
                    {log.templateName && (
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                        {log.templateName}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>
                      {log.content}
                    </div>
                    {log.errorReason && (
                      <div
                        style={{
                          fontSize: 11,
                          color: log.status === 'skipped' ? '#92400e' : '#b91c1c',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ShieldAlert size={12} /> {log.errorReason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 14, fontSize: 13, color: 'var(--color-muted-text)' }}>
                    {log.delayMs !== undefined ? `${(log.delayMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td style={{ padding: 14 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: chip.bg,
                        color: chip.color,
                      }}
                    >
                      {chip.pulse && (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: chip.color,
                            animation: 'pulseDot 1s infinite ease-in-out',
                          }}
                        />
                      )}
                      {chip.label}
                    </span>
                  </td>
                  <td style={{ padding: 14, textAlign: 'right' }}>
                    {log.status === 'failed' && (
                      <Button
                        onClick={() => retryMessage(log)}
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                        }}
                      >
                        <RefreshCw size={12} style={{ marginRight: 4 }} /> Retry
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-text)' }}
                >
                  No messages sent yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
