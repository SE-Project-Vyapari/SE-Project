import React, { useState } from 'react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import type { Customer } from '../../../types';
import {
  Clock,
  CheckCircle2,
  Plus,
  Sparkles,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import styles from '../styles/crm.module.css';

interface FollowUpsPanelProps {
  customer: Customer;
}

export const FollowUpsPanel: React.FC<FollowUpsPanelProps> = ({ customer }) => {
  const store = useStore();
  const { followUps, users, orders, orderItems, products } = store;

  // Local state for adding manual follow-up
  const [showAddForm, setShowAddForm] = useState(false);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // default: in 2 days
  );
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Filter follow-ups for this customer
  const customerFollowUps = followUps.filter(f => f.customerId === customer.id);
  const pendingFollowUps = customerFollowUps.filter(f => f.status === 'pending');
  const completedFollowUps = customerFollowUps.filter(f => f.status === 'completed');

  // Compute urgency level: 'overdue' | 'today' | 'upcoming'
  const getUrgency = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    return 'upcoming';
  };

  // Generate dynamic suggested follow-ups
  const suggestions: Array<{
    id: string;
    note: string;
    reason: string;
  }> = [];

  // 1. Check outstanding balance
  if ((customer.outstandingBalance || 0) > 0) {
    suggestions.push({
      id: 'sug-balance',
      note: `Follow up on outstanding balance of ₹${customer.outstandingBalance?.toLocaleString('en-IN')}`,
      reason: 'Outstanding payment due'
    });
  }

  // 2. Check product reorder recency
  const custOrders = orders.filter(o => o.customerId === customer.id && o.status !== 'cancelled');
  const custOrderIds = new Set(custOrders.map(o => o.id));
  const custItems = orderItems.filter(i => custOrderIds.has(i.orderId));

  // Find most frequent product
  const productCount: { [id: string]: { count: number; lastDate: string } } = {};
  custItems.forEach(i => {
    const ord = custOrders.find(o => o.id === i.orderId);
    const date = ord?.createdAt || '';
    if (!productCount[i.productId]) {
      productCount[i.productId] = { count: 0, lastDate: date };
    }
    productCount[i.productId].count += i.quantity;
    if (date && new Date(date) > new Date(productCount[i.productId].lastDate)) {
      productCount[i.productId].lastDate = date;
    }
  });

  Object.entries(productCount).forEach(([pId, stat]) => {
    if (stat.lastDate) {
      const daysSince = Math.floor((Date.now() - new Date(stat.lastDate).getTime()) / (1000 * 3600 * 24));
      if (daysSince >= 25) {
        const prod = products.find(p => p.id === pId);
        if (prod && suggestions.length < 2) {
          suggestions.push({
            id: `sug-reorder-${pId}`,
            note: `Hasn't purchased ${prod.name} in ${daysSince} days — suggest reorder reminder`,
            reason: `Past average repurchase interval (${daysSince}d)`
          });
        }
      }
    }
  });

  // Handle adding follow-up
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      await mockApi.createFollowUp({
        customerId: customer.id,
        note: note.trim(),
        dueDate,
        assigneeId: assigneeId || undefined
      });
      setNote('');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert suggested follow-up to real follow-up
  const handleConvertSuggestion = async (sugNote: string) => {
    try {
      await mockApi.createFollowUp({
        customerId: customer.id,
        note: sugNote,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        isSuggested: true
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create follow-up');
    }
  };

  // Mark complete
  const handleComplete = async (fId: string) => {
    try {
      await mockApi.completeFollowUp(fId);
    } catch (err: any) {
      alert(err.message || 'Failed to complete follow-up');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="var(--color-primary)" />
          <h3 className={styles.cardTitle}>Follow-ups & Tasks</h3>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Add Follow-up
        </button>
      </div>

      {/* Opt-out Warning Note */}
      {customer.optInForMessages === false && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(184, 74, 62, 0.08)',
            border: '1px solid rgba(184, 74, 62, 0.2)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--color-danger)'
          }}
        >
          <AlertTriangle size={16} />
          <span>Customer has opted out of automated promotional messages. Contact manually via call/email.</span>
        </div>
      )}

      {/* Suggested Follow-ups */}
      {suggestions.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={14} /> Suggested Follow-ups (System-generated)
          </div>
          {suggestions.map(sug => (
            <div key={sug.id} className={styles.suggestedFollowUp}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{sug.note}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted-text)', marginTop: 2 }}>{sug.reason}</div>
                </div>
                <button
                  onClick={() => handleConvertSuggestion(sug.note)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Create Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Follow-up Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddFollowUp}
          style={{
            padding: 12,
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>Create New Follow-up</div>
          <input
            type="text"
            placeholder="Note / Description (e.g. Call regarding quotation)"
            value={note}
            onChange={e => setNote(e.target.value)}
            className={styles.inputField}
            required
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-muted-text)', display: 'block', marginBottom: 4 }}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-muted-text)', display: 'block', marginBottom: 4 }}>Assignee</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className={styles.selectField}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Pending Follow-ups List */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', marginBottom: 8 }}>
          Pending ({pendingFollowUps.length})
        </div>

        {pendingFollowUps.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--color-muted-text)', fontSize: 13 }}>
            No pending follow-ups. Great job!
          </div>
        ) : (
          pendingFollowUps.map(fu => {
            const urgency = getUrgency(fu.dueDate);
            const assignee = users.find(u => u.id === fu.assigneeId);

            let urgencyClass = styles.followUpUpcoming;
            let urgencyBadge = <span className={`${styles.badge} ${styles.badgeNew}`}>Upcoming</span>;

            if (urgency === 'overdue') {
              urgencyClass = styles.followUpOverdue;
              urgencyBadge = <span className={`${styles.badge} ${styles.badgeRiskHigh}`}>Overdue</span>;
            } else if (urgency === 'today') {
              urgencyClass = styles.followUpToday;
              urgencyBadge = <span className={`${styles.badge} ${styles.badgeRiskMedium}`}>Due Today</span>;
            }

            return (
              <div key={fu.id} className={`${styles.followUpItem} ${urgencyClass}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                  <button
                    onClick={() => handleComplete(fu.id)}
                    title="Mark complete"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-muted-text)',
                      padding: 0,
                      marginTop: 2
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{fu.note}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted-text)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>Due: {new Date(fu.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      {assignee && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={12} /> {assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {urgencyBadge}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completed Follow-ups Toggle */}
      {completedFollowUps.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              padding: 0
            }}
          >
            {showCompleted ? 'Hide' : 'Show'} completed follow-ups ({completedFollowUps.length})
          </button>

          {showCompleted && (
            <div style={{ marginTop: 10 }}>
              {completedFollowUps.map(fu => (
                <div key={fu.id} className={`${styles.followUpItem} ${styles.followUpCompleted}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <span style={{ fontSize: 13 }}>{fu.note}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>
                    Completed {fu.completedAt ? new Date(fu.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
