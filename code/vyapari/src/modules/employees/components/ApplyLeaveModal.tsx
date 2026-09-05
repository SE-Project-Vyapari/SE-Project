import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import styles from '../styles/employees.module.css';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onApplied?: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onApplied
}) => {
  const employees = useStore(state => state.employees);
  const employee = employees.find(e => e.id === employeeId);

  const todayStr = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<'paid' | 'casual' | 'sick' | 'unpaid'>('casual');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !employee) return null;

  // Calculate day difference
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSaving(true);
    try {
      await mockApi.applyLeave({
        employeeId,
        type,
        startDate,
        endDate,
        reason: reason.trim()
      });

      if (onApplied) onApplied();
      onClose();
    } catch (err) {
      console.error('Failed to apply leave:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} color="var(--color-primary)" />
            <div>
              <h3>Apply Leave for {employee.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--color-muted-text)', margin: 0 }}>
                {employee.role} — {employee.department}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Leave Category</label>
              <select value={type} onChange={e => setType(e.target.value as any)}>
                <option value="casual">Casual Leave (Balance: {employee.leaveBalance?.casual ?? 8} days)</option>
                <option value="sick">Sick Leave (Balance: {employee.leaveBalance?.sick ?? 6} days)</option>
                <option value="paid">Earned / Paid Leave (Balance: {employee.leaveBalance?.paid ?? 12} days)</option>
                <option value="unpaid">Unpaid Leave (Direct Payroll Deduction)</option>
              </select>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label>End Date</label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.calculationCallout}>
              <span style={{ fontSize: 13, color: 'var(--color-text)' }}>Total Leave Duration:</span>
              <strong style={{ fontSize: 16, color: '#6366f1' }}>{diffDays} Day(s)</strong>
            </div>

            <div className={styles.formGroup}>
              <label>Reason / Remarks *</label>
              <textarea
                required
                rows={3}
                placeholder="Specify reason for leave..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {saving ? 'Submitting...' : 'Approve & Record Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
