import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import { PredictionBadge } from '../../../../components/ui/PredictionBadge';
import styles from '../../styles/ai-assistant.module.css';
import { PieChart, ArrowRight } from 'lucide-react';
import { format, parseISO, isSameMonth } from 'date-fns';

export const BiggestExpensesAnswer: React.FC = () => {
  const navigate = useNavigate();
  const expenses = useStore(state => state.expenses);

  const { totalExpenseAmount, categoryBreakdown, topExpenses } = useMemo(() => {
    // Current month expenses (or all if not many)
    const now = new Date();
    let currentMonthExpenses = expenses.filter(e => {
      try {
        return isSameMonth(parseISO(e.date), now);
      } catch {
        return true;
      }
    });

    if (currentMonthExpenses.length === 0) {
      currentMonthExpenses = expenses;
    }

    const total = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Group by category
    const catMap = new Map<string, number>();
    currentMonthExpenses.forEach(e => {
      const cat = e.category || 'Miscellaneous';
      catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
    });

    const categoryList = Array.from(catMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedExpenses = [...currentMonthExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalExpenseAmount: total,
      categoryBreakdown: categoryList,
      topExpenses: sortedExpenses
    };
  }, [expenses]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Math.round(val)
    );

  const topCategory = categoryBreakdown[0] || { category: 'None', amount: 0, percentage: 0 };

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChart size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>Operational Expense Intelligence</span>
        </div>
        <PredictionBadge variant="prediction" size="sm" />
      </div>

      <div className={styles.answerSummaryText}>
        Total overhead & operational expenditure is <strong>{formatINR(totalExpenseAmount)}</strong>. The largest
        cost driver is <strong>{topCategory.category}</strong> at{' '}
        <strong>{formatINR(topCategory.amount)}</strong> ({topCategory.percentage}% of overall expenses).
      </div>

      {/* Mini KPI Grid */}
      <div className={styles.metricMiniGrid}>
        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Total Overhead</span>
          <span className={styles.metricMiniValue} style={{ color: '#dc2626' }}>
            {formatINR(totalExpenseAmount)}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Top Cost Category</span>
          <span className={styles.metricMiniValue} style={{ fontSize: 16 }}>
            {topCategory.category} ({topCategory.percentage}%)
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Categories Tracked</span>
          <span className={styles.metricMiniValue}>{categoryBreakdown.length}</span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Recorded Vouchers</span>
          <span className={styles.metricMiniValue}>{expenses.length}</span>
        </div>
      </div>

      {/* Category Breakdown & Top Expenses Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-muted-text)' }}>
          Top Expense Entries
        </h4>
        <div className={styles.tableWrapper}>
          <table className={styles.answerTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className={styles.textRight}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {topExpenses.map(exp => (
                <tr key={exp.id}>
                  <td>
                    {(() => {
                      try {
                        return format(parseISO(exp.date), 'dd MMM yyyy');
                      } catch {
                        return exp.date;
                      }
                    })()}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-dark)' }}>{exp.description}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(0,0,0,0.05)'
                      }}
                    >
                      {exp.category}
                    </span>
                  </td>
                  <td className={styles.textRight} style={{ fontWeight: 700, color: '#dc2626' }}>
                    {formatINR(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Audited from general ledger and expense voucher records
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => navigate('/finance')}
          >
            Open Finance Ledger <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
