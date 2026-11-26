import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../context/NotificationContext';
import { useStore } from '../services/store';
import { DEFAULT_TEMPLATES, interpolateTemplate, sendMessage } from '../services/mockMessaging';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Eye, MessageSquare, Plus, Send, Trash2, ShieldCheck } from 'lucide-react';
import type { NotificationRule } from '../types';

export const AutomationRulesPage = () => {
  const navigate = useNavigate();
  const { rules, toggleRule, addRule, deleteRule } = useNotificationContext();
  const customers = useStore(state => state.customers);
  const products = useStore(state => state.products);
  const outlets = useStore(state => state.outlets);

  const [newEvent, setNewEvent] = useState('stock.belowThreshold');
  const [newAction, setNewAction] = useState<'whatsapp' | 'sms' | 'email' | 'in_app'>('whatsapp');
  const [showAddForm, setShowAddForm] = useState(false);

  const [previewRule, setPreviewRule] = useState<NotificationRule | null>(null);
  const [previewCustomerId, setPreviewCustomerId] = useState<string>(customers[0]?.id || '');
  const [testSentBanner, setTestSentBanner] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const tpl = DEFAULT_TEMPLATES[newEvent];
    const triggerLabels: Record<string, string> = {
      'stock.belowThreshold': 'Stock < Reorder Level',
      'order.statusChanged': 'Order Status = Ready',
      'churn.riskChanged': 'Churn Risk Crosses High Threshold',
      'invoice.overdue': 'Invoice Overdue',
    };
    const isCustomerRule = newEvent !== 'stock.belowThreshold';
    addRule({
      name: tpl?.name || newEvent,
      triggerEvent: newEvent,
      triggerLabel: triggerLabels[newEvent] || newEvent,
      recipientType: isCustomerRule ? 'Customer' : 'Owner / Manager',
      action: newAction,
      template: tpl?.body || `Automated alert for ${newEvent}`,
      enabled: true,
    });
    setShowAddForm(false);
  };

  const getSampleData = () => {
    const customer = customers.find(c => c.id === previewCustomerId) || customers[0];
    const product = products[9] || products[0]; // Stainless Steel Kadhai or Basmati Rice
    const outlet = outlets[0];

    return {
      customer,
      data: {
        productName: product?.name || 'Stainless Steel Kadhai',
        outletName: outlet?.name || 'Downtown Branch',
        remaining: 4,
        reorderLevel: 10,
        customerName: customer?.name || 'Priya Sharma',
        orderId: 'ord-1042',
        amount: 1450,
        favoriteProduct: products[0]?.name || 'Basmati Rice (5kg)',
        invoiceNumber: 'INV-2026-001',
        score: 84,
      },
    };
  };

  const handleSendTest = async () => {
    if (!previewRule) return;
    const { customer, data } = getSampleData();
    const isCustomerDirected = previewRule.recipientType === 'Customer';
    const recipient =
      isCustomerDirected && customer ? customer : 'Owner / Manager (+91 98100 00001)';
    const channel =
      previewRule.action === 'in_app' ? 'whatsapp' : previewRule.action;

    const log = await sendMessage(
      recipient,
      channel,
      previewRule.triggerEvent,
      data,
      previewRule.template
    );

    if (log.status === 'skipped') {
      setTestSentBanner(
        `Skipped: ${customer?.name || 'Customer'} has opted out of automated messages.`
      );
    } else {
      setTestSentBanner(
        `Queued ${channel.toUpperCase()} message to ${log.recipientName}. Check Message Logs for live Queued -> Sent -> Delivered progression.`
      );
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
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>
            WhatsApp &amp; SMS Automation Rules
          </h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
            Configure automated triggers, message templates, and delivery channels
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            onClick={() => navigate('/message-logs')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <MessageSquare size={16} style={{ marginRight: 6 }} /> View Message Logs
          </Button>
          <Button
            onClick={() => setShowAddForm(prev => !prev)}
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Plus size={16} style={{ marginRight: 6 }} /> New Rule
          </Button>
        </div>
      </div>

      {/* Sandbox Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 8,
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          color: '#0369a1',
          fontSize: 13,
        }}
      >
        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Sandbox Simulator Mode:</strong> Messages are simulated locally via{' '}
          <code>mockMessaging.ts</code> (no WhatsApp Business API or Twilio credentials required).
          Customer-directed rules strictly enforce <code>Customer.optedIn</code> before sending.
        </span>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            backgroundColor: 'var(--color-surface)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Trigger Event</label>
            <select
              value={newEvent}
              onChange={e => setNewEvent(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
              }}
            >
              <option value="stock.belowThreshold">Low Stock (stock.belowThreshold)</option>
              <option value="order.statusChanged">Order Ready (order.statusChanged)</option>
              <option value="churn.riskChanged">Customer Retention (churn.riskChanged)</option>
              <option value="invoice.overdue">Invoice Overdue (invoice.overdue)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Channel</label>
            <select
              value={newAction}
              onChange={e => setNewAction(e.target.value as any)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
              }}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="in_app">In-App Only</option>
            </select>
          </div>
          <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            Save Rule
          </Button>
        </form>
      )}

      {/* Automation Rules Table */}
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
              <th style={{ padding: 14 }}>Rule &amp; Trigger</th>
              <th style={{ padding: 14 }}>Recipient Type</th>
              <th style={{ padding: 14 }}>Channel</th>
              <th style={{ padding: 14 }}>Template</th>
              <th style={{ padding: 14 }}>Status</th>
              <th style={{ padding: 14, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => {
              const tplBody =
                rule.template || DEFAULT_TEMPLATES[rule.triggerEvent]?.body || rule.triggerEvent;
              return (
                <tr key={rule.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {rule.name || DEFAULT_TEMPLATES[rule.triggerEvent]?.name || rule.triggerEvent}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 2 }}>
                      {rule.triggerLabel || rule.triggerEvent}
                    </div>
                  </td>
                  <td style={{ padding: 14, fontSize: 13 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        fontWeight: 500,
                      }}
                    >
                      {rule.recipientType ||
                        (rule.triggerEvent === 'stock.belowThreshold'
                          ? 'Owner / Manager'
                          : 'Customer')}
                    </span>
                  </td>
                  <td style={{ padding: 14 }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        backgroundColor:
                          rule.action === 'whatsapp'
                            ? '#dcfce7'
                            : rule.action === 'sms'
                            ? '#e0f2fe'
                            : '#f3f4f6',
                        color:
                          rule.action === 'whatsapp'
                            ? '#166534'
                            : rule.action === 'sms'
                            ? '#075985'
                            : '#374151',
                      }}
                    >
                      {rule.action}
                    </span>
                  </td>
                  <td style={{ padding: 14, maxWidth: 320 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--color-muted-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 6,
                      }}
                    >
                      {tplBody}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestSentBanner(null);
                        setPreviewRule(rule);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={13} /> Preview message
                    </button>
                  </td>
                  <td style={{ padding: 14 }}>
                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: rule.enabled ? '#dcfce7' : '#f3f4f6',
                        color: rule.enabled ? '#166534' : '#6b7280',
                      }}
                    >
                      {rule.enabled ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td style={{ padding: 14, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => deleteRule(rule.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger, #dc2626)',
                        cursor: 'pointer',
                        padding: 6,
                      }}
                      title="Delete Rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rules.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-text)' }}
                >
                  No automation rules configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Message Modal */}
      {previewRule && (
        <Modal
          isOpen={!!previewRule}
          onClose={() => setPreviewRule(null)}
          title={`Preview: ${previewRule.name || previewRule.triggerEvent}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {previewRule.recipientType === 'Customer' && customers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Sample Customer (for template interpolation)
                </label>
                <select
                  value={previewCustomerId}
                  onChange={e => setPreviewCustomerId(e.target.value)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                      {c.optInForMessages === false || c.optedIn === false
                        ? ' — Opted Out'
                        : ' — Opted In'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', marginBottom: 6 }}>
                FILLED-IN MESSAGE PREVIEW ({previewRule.action.toUpperCase()})
              </div>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: '#064e3b',
                }}
              >
                {interpolateTemplate(
                  previewRule.template ||
                    DEFAULT_TEMPLATES[previewRule.triggerEvent]?.body ||
                    '',
                  getSampleData().data
                )}
              </div>
            </div>

            {testSentBanner && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  fontSize: 13,
                }}
              >
                {testSentBanner}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                onClick={handleSendTest}
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                <Send size={14} style={{ marginRight: 6 }} /> Send Simulated Test
              </Button>
              <Button
                onClick={() => setPreviewRule(null)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
