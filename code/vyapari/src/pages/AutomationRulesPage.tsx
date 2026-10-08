import { useNotificationContext } from '../context/NotificationContext';
import { Button } from '../components/ui/Button';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

export const AutomationRulesPage = () => {
  const { rules, toggleRule, addRule, deleteRule } = useNotificationContext();
  const [newEvent, setNewEvent] = useState('stock.belowThreshold');
  const [newAction, setNewAction] = useState<'in_app' | 'sms' | 'email'>('in_app');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addRule({ triggerEvent: newEvent, action: newAction, enabled: true });
  };

  return (
    <div style={{ padding: 'var(--spacing-32)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      <div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>Automation Rules</h1>
        <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>Configure system automations and triggers</p>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', backgroundColor: 'var(--color-surface)', padding: 16, borderRadius: 8, border: '1px solid var(--color-border)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Trigger Event</label>
          <select value={newEvent} onChange={e => setNewEvent(e.target.value)} style={{ padding: 8, borderRadius: 4, border: '1px solid var(--color-border)' }}>
            <option value="stock.belowThreshold">Stock Below Threshold</option>
            <option value="order.statusChanged">Order Status Changed</option>
            <option value="invoice.overdue">Invoice Overdue</option>
            <option value="customer.churnRisk">Customer Churn Risk</option>
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Action Channel</label>
          <select value={newAction} onChange={e => setNewAction(e.target.value as any)} style={{ padding: 8, borderRadius: 4, border: '1px solid var(--color-border)' }}>
            <option value="in_app">In-App Notification</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
          Add Rule
        </Button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{ padding: 16, backgroundColor: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0' }}>Event: {rule.triggerEvent}</h4>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted-text)' }}>Action Channel: <strong style={{ textTransform: 'uppercase' }}>{rule.action}</strong></p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={rule.enabled} 
                  onChange={() => toggleRule(rule.id)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                Enabled
              </label>
              <button 
                onClick={() => deleteRule(rule.id)}
                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 8 }}
                title="Delete Rule"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-text)' }}>No automation rules found</div>
        )}
      </div>
    </div>
  );
};
