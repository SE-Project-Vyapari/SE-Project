import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import { PredictionBadge } from '../../../../components/ui/PredictionBadge';
import styles from '../../styles/ai-assistant.module.css';
import { FileText, ArrowRight } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';

export const UnpaidInvoicesAnswer: React.FC = () => {
  const navigate = useNavigate();
  const invoices = useStore(state => state.invoices);
  const customers = useStore(state => state.customers);

  const { unpaidList, totalOutstanding, overdueCount, overdueAmount } = useMemo(() => {
    const list = invoices.filter(inv => {
      const st = (inv.status || '').toLowerCase();
      return st === 'unpaid' || st === 'overdue' || st === 'partially_paid';
    });

    let totalBal = 0;
    let odCount = 0;
    let odAmt = 0;

    const mapped = list.map(inv => {
      const balance = inv.amount - (inv.amountPaid || 0);
      totalBal += balance;

      let isOverdue = inv.status === 'overdue';
      if (!isOverdue && inv.dueDate) {
        try {
          isOverdue = isPast(parseISO(inv.dueDate));
        } catch {
          // ignore
        }
      }

      if (isOverdue) {
        odCount += 1;
        odAmt += balance;
      }

      const cust = customers.find(c => c.id === inv.customerId);

      return {
        ...inv,
        customerName: cust ? cust.name : 'Walk-in / Direct Client',
        balanceDue: balance,
        isOverdue
      };
    });

    return {
      unpaidList: mapped.sort((a, b) => b.balanceDue - a.balanceDue),
      totalOutstanding: totalBal,
      overdueCount: odCount,
      overdueAmount: odAmt
    };
  }, [invoices, customers]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Math.round(val)
    );

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>Accounts Receivable & Invoices</span>
        </div>
        <PredictionBadge variant="prediction" size="sm" />
      </div>

      <div className={styles.answerSummaryText}>
        {unpaidList.length > 0 ? (
          <>
            There are <strong>{unpaidList.length} outstanding invoices</strong> totaling{' '}
            <strong>{formatINR(totalOutstanding)}</strong> in unpaid receivables. Of these,{' '}
            <strong style={{ color: '#dc2626' }}>{overdueCount} are past their due date</strong> (
            <strong>{formatINR(overdueAmount)}</strong> overdue).
          </>
        ) : (
          <>
            All client invoices are currently marked as settled. Total outstanding receivables is ₹0.
          </>
        )}
      </div>

      {/* Mini KPI Grid */}
      <div className={styles.metricMiniGrid}>
        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Total Receivables</span>
          <span className={styles.metricMiniValue} style={{ color: 'var(--color-primary)' }}>
            {formatINR(totalOutstanding)}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Overdue Invoices</span>
          <span
            className={styles.metricMiniValue}
            style={{ color: overdueCount > 0 ? '#dc2626' : 'var(--color-success)' }}
          >
            {overdueCount}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Overdue Capital</span>
          <span className={styles.metricMiniValue} style={{ color: overdueAmount > 0 ? '#dc2626' : undefined }}>
            {formatINR(overdueAmount)}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Total Unsettled</span>
          <span className={styles.metricMiniValue}>{unpaidList.length}</span>
        </div>
      </div>

      {/* Invoices Table */}
      {unpaidList.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.answerTable}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client / Customer</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className={styles.textRight}>Total (₹)</th>
                <th className={styles.textRight}>Balance Due (₹)</th>
              </tr>
            </thead>
            <tbody>
              {unpaidList.slice(0, 6).map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {inv.invoiceNumber || inv.id}
                  </td>
                  <td>{inv.customerName}</td>
                  <td>
                    {inv.dueDate ? (
                      (() => {
                        try {
                          return format(parseISO(inv.dueDate), 'dd MMM yyyy');
                        } catch {
                          return inv.dueDate;
                        }
                      })()
                    ) : (
                      'Immediate'
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          inv.isOverdue
                            ? 'rgba(220, 38, 38, 0.1)'
                            : 'rgba(234, 179, 8, 0.1)',
                        color: inv.isOverdue ? '#dc2626' : '#b45309'
                      }}
                    >
                      {inv.isOverdue ? 'Overdue' : inv.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={styles.textRight}>{formatINR(inv.amount)}</td>
                  <td className={styles.textRight} style={{ fontWeight: 700, color: '#dc2626' }}>
                    {formatINR(inv.balanceDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Real-time reconciliation with GST B2B & B2C Billing
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => navigate('/invoices')}
          >
            Manage Invoices <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
