import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import styles from '../styles/payroll.module.css';

interface NewPayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (runId: string) => void;
}

export const NewPayrollRunModal: React.FC<NewPayrollRunModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const employees = useStore(state => state.employees);
  const payrollRuns = useStore(state => state.payrollRuns);

  // Default month: Current month formatted as YYYY-MM
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [month, setMonth] = useState<string>(currentMonthStr);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const activeEmployees = employees.filter(e => e.status === 'active');
  const existingRun = payrollRuns.find(r => r.month === month);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month) return;

    setSubmitting(true);
    try {
      const run = await mockApi.startPayrollRun('b-1', month);
      onCreated(run.id);
      onClose();
    } catch (err) {
      console.error('Failed to create payroll run:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const [y, m] = month.split('-');
  const monthName = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PlusCircle size={22} color="var(--color-primary)" />
            <h3>Start New Payroll Run</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {existingRun ? (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#1d4ed8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} />
                <span>
                  A payroll cycle for <strong>{monthName}</strong> already exists ({existingRun.status.toUpperCase()}). Opening will load the existing run.
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--color-muted-text)', margin: 0 }}>
                Select the target month to initiate a fresh payroll disbursement run. All active employees will be drafted into the calculation queue.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                Select Payroll Month *
              </label>
              <input
                type="month"
                required
                value={month}
                onChange={e => setMonth(e.target.value)}
                style={{
                  padding: '10px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
            </div>

            <div style={{ backgroundColor: 'var(--color-background)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>Active Employees in Cycle</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                  {activeEmployees.length} Staff Members
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>Cycle Period</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', marginTop: 2 }}>
                  {monthName}
                </div>
              </div>
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
              disabled={submitting}
              style={{
                padding: '8px 24px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {submitting ? 'Initiating...' : existingRun ? 'Open Existing Run' : 'Generate Payroll Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
