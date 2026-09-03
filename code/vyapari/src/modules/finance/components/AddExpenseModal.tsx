import React, { useState } from 'react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import { X, AlertCircle, PlusCircle } from 'lucide-react';
import styles from '../styles/finance.module.css';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Inventory',
  'Logistics',
  'Marketing',
  'Miscellaneous'
] as const;

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, onSuccess }) => {
  const store = useStore();
  const { outlets } = store;

  const todayStr = new Date().toISOString().split('T')[0];

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Rent');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(todayStr);
  const [outletId, setOutletId] = useState(outlets[0]?.id || 'o-1');
  const [recurring, setRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if date is in future
  const isFutureDate = date > todayStr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await mockApi.addExpense({
        outletId,
        category,
        amount: parsedAmount,
        description: description.trim(),
        date: new Date(date).toISOString(),
        recurring,
        status: 'paid'
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="var(--color-danger)" />
            <h3 className={styles.modalTitle}>Record Operating Expense</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-text)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(184, 74, 62, 0.1)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  color: 'var(--color-danger)'
                }}
              >
                {error}
              </div>
            )}

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="expDesc">Description *</label>
              <input
                id="expDesc"
                type="text"
                placeholder="e.g., Monthly electricity bill, shop renovation..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={styles.formInput}
                autoFocus
              />
            </div>

            {/* Category and Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formGroup}>
                <label htmlFor="expCat">Category *</label>
                <select
                  id="expCat"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={styles.formInput}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="expAmount">Amount (₹) *</label>
                <input
                  id="expAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="₹0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={`${styles.formInput} tabular-nums`}
                />
              </div>
            </div>

            {/* Date and Outlet */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formGroup}>
                <label htmlFor="expDate">Date *</label>
                <input
                  id="expDate"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="expOutlet">Outlet *</label>
                <select
                  id="expOutlet"
                  value={outletId}
                  onChange={e => setOutletId(e.target.value)}
                  className={styles.formInput}
                >
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Future Date Alert */}
            {isFutureDate && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(184, 134, 59, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: 'var(--color-warning)'
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Future Date Flag:</strong> This expense is dated in the future. It will be logged as an accrued/scheduled obligation.
                </span>
              </div>
            )}

            {/* Recurring Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                id="expRecurring"
                type="checkbox"
                checked={recurring}
                onChange={e => setRecurring(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="expRecurring" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                Recurring monthly obligation (Rent, recurring subscription, regular bill)
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.btnSecondary}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              style={{ backgroundColor: 'var(--color-danger)' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Expense & Post to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
