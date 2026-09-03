import React, { useState } from 'react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import { X, Info, PlusCircle } from 'lucide-react';
import styles from '../styles/finance.module.css';

const INCOME_CATEGORIES = [
  'Other Income',
  'Scrap Sale',
  'Interest Income',
  'Vendor Commission',
  'Capital Infusion',
  'Manual Adjustment'
] as const;

interface AddIncomeModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ onClose, onSuccess }) => {
  const store = useStore();
  const { outlets } = store;

  const todayStr = new Date().toISOString().split('T')[0];

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Other Income');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(todayStr);
  const [outletId, setOutletId] = useState(outlets[0]?.id || 'o-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid income amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await mockApi.addIncome({
        outletId,
        category,
        amount: parsedAmount,
        description: description.trim(),
        date: new Date(date).toISOString()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record income.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="var(--color-success)" />
            <h3 className={styles.modalTitle}>Record Non-Sale Income</h3>
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
            {/* Note clarifying separate from POS */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                backgroundColor: 'rgba(91, 122, 91, 0.08)',
                border: '1px solid rgba(91, 122, 91, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--color-dark)'
              }}
            >
              <Info size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Non-Sale Inflows Only:</strong> Standard POS retail & wholesale sales post to the ledger automatically upon checkout. Use this form for scrap resale, interest, bank adjustments, or other miscellaneous non-inventory receipts.
              </div>
            </div>

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
              <label htmlFor="incDesc">Description *</label>
              <input
                id="incDesc"
                type="text"
                placeholder="e.g., Old packaging crates resale, interest credit..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={styles.formInput}
                autoFocus
              />
            </div>

            {/* Category and Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formGroup}>
                <label htmlFor="incCat">Category *</label>
                <select
                  id="incCat"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={styles.formInput}
                >
                  {INCOME_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="incAmount">Amount (₹) *</label>
                <input
                  id="incAmount"
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
                <label htmlFor="incDate">Date *</label>
                <input
                  id="incDate"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="incOutlet">Outlet (Optional)</label>
                <select
                  id="incOutlet"
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
              style={{ backgroundColor: 'var(--color-success)' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Credit & Post to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
