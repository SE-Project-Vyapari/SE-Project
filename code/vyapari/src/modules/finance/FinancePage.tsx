import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../services/store';
import { FinanceSummaryRow } from './components/FinanceSummaryRow';
import { FinanceCharts, type TimelineDataPoint, type CategoryDataPoint } from './components/FinanceCharts';
import { LedgerTable, type LedgerRowWithBalance } from './components/LedgerTable';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddIncomeModal } from './components/AddIncomeModal';
import { ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import styles from './styles/finance.module.css';

type DatePreset = 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'thisFY' | 'custom';

export const FinancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useStore();
  const { ledgerEntries, expenses, invoices } = store;

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(searchParams.get('add') === 'true');
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  // Date Range state
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0]);

  // If query param ?add=true is removed when closing modal
  useEffect(() => {
    if (searchParams.get('add') === 'true' && !showExpenseModal) {
      setShowExpenseModal(true);
    }
  }, [searchParams]);

  // Compute start and end dates based on preset
  const { startDate, endDate, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = 'Last 30 Days';

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        label = 'Today';
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        label = 'Last 7 Days';
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        label = 'Last 30 Days';
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        label = 'This Month';
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = 'Last Month';
        break;
      case 'thisFY': {
        // Indian Financial Year: April 1 to March 31
        const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(currentYear, 3, 1);
        end = new Date(currentYear + 1, 2, 31, 23, 59, 59, 999);
        label = `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
        break;
      }
      case 'custom':
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        label = `${customStart} to ${customEnd}`;
        break;
    }

    return { startDate: start, endDate: end, dateRangeLabel: label };
  }, [preset, customStart, customEnd]);

  // Calculate chronological running balance across ALL historical ledger entries
  const allEntriesSortedWithBalance: LedgerRowWithBalance[] = useMemo(() => {
    // Sort oldest to newest for chronological balance accumulation
    const sorted = [...ledgerEntries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cumulative = 0;
    return sorted.map(entry => {
      if (entry.type === 'credit') {
        cumulative += entry.amount;
      } else {
        cumulative -= entry.amount;
      }
      return {
        ...entry,
        runningBalance: cumulative
      };
    });
  }, [ledgerEntries]);

  // Overall Cash Position = running balance of latest ledger entry
  const overallCashPosition = useMemo(() => {
    if (allEntriesSortedWithBalance.length === 0) return 0;
    return allEntriesSortedWithBalance[allEntriesSortedWithBalance.length - 1].runningBalance;
  }, [allEntriesSortedWithBalance]);

  // In-Period Ledger Entries
  const inPeriodEntriesWithBalance = useMemo(() => {
    return allEntriesSortedWithBalance
      .filter(entry => {
        const time = new Date(entry.createdAt).getTime();
        return time >= startDate.getTime() && time <= endDate.getTime();
      })
      .reverse(); // Newest first for presentation in table
  }, [allEntriesSortedWithBalance, startDate, endDate]);

  // P&L Summary Metrics Calculation
  const summaryMetrics = useMemo(() => {
    let periodRevenue = 0;
    let periodExpenses = 0;
    let periodCogs = 0;

    // Filter ledger entries in period
    const inPeriod = allEntriesSortedWithBalance.filter(entry => {
      const time = new Date(entry.createdAt).getTime();
      return time >= startDate.getTime() && time <= endDate.getTime();
    });

    inPeriod.forEach(entry => {
      if (entry.type === 'credit') {
        // Sales and other income count towards revenue
        if (entry.sourceType === 'sale' || entry.sourceType === 'income') {
          periodRevenue += entry.amount;
        } else if (entry.sourceType === 'payment') {
          // If invoice payments are recorded without duplicating sales
          periodRevenue += 0;
        }
      } else if (entry.type === 'debit') {
        periodExpenses += entry.amount;
        if (entry.category === 'Inventory') {
          periodCogs += entry.amount;
        }
      }
    });

    // If no direct inventory expenses in period, estimate COGS from orders in period
    if (periodCogs === 0 && periodRevenue > 0) {
      periodCogs = Math.round(periodRevenue * 0.65); // Standard 65% cost basis estimate for retail staples
    }

    // Gross Profit = Revenue - COGS
    const grossProfit = periodRevenue - periodCogs;

    // Net Profit = Revenue - Total Expenses
    const netProfit = periodRevenue - periodExpenses;

    // Receivables = Sum of unpaid / partially paid invoices
    const receivables = invoices
      .filter(inv => inv.status === 'unpaid' || inv.status === 'partially_paid')
      .reduce((sum, inv) => sum + (inv.amount - (inv.amountPaid || 0)), 0);

    // Payables = Sum of unpaid expenses (0 if none)
    const payables = expenses
      .filter(exp => exp.status === 'unpaid')
      .reduce((sum, exp) => sum + exp.amount, 0);

    return {
      revenue: periodRevenue,
      expenses: periodExpenses,
      grossProfit,
      netProfit,
      receivables,
      payables,
      cashPosition: overallCashPosition
    };
  }, [allEntriesSortedWithBalance, invoices, expenses, startDate, endDate, overallCashPosition]);

  // Timeline Data for Charts
  const timelineData: TimelineDataPoint[] = useMemo(() => {
    const inPeriod = allEntriesSortedWithBalance.filter(entry => {
      const time = new Date(entry.createdAt).getTime();
      return time >= startDate.getTime() && time <= endDate.getTime();
    });

    const dayMap: Record<string, { revenue: number; expenses: number }> = {};

    inPeriod.forEach(entry => {
      const dayKey = new Date(entry.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });

      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { revenue: 0, expenses: 0 };
      }

      if (entry.type === 'credit' && (entry.sourceType === 'sale' || entry.sourceType === 'income')) {
        dayMap[dayKey].revenue += entry.amount;
      } else if (entry.type === 'debit') {
        dayMap[dayKey].expenses += entry.amount;
      }
    });

    return Object.entries(dayMap).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      expenses: val.expenses,
      profit: val.revenue - val.expenses
    }));
  }, [allEntriesSortedWithBalance, startDate, endDate]);

  // Expense Category Breakdown for Donut Chart
  const categoryData: CategoryDataPoint[] = useMemo(() => {
    const inPeriod = allEntriesSortedWithBalance.filter(entry => {
      const time = new Date(entry.createdAt).getTime();
      return time >= startDate.getTime() && time <= endDate.getTime() && entry.type === 'debit';
    });

    const catMap: Record<string, number> = {
      Rent: 0,
      Utilities: 0,
      Salaries: 0,
      Inventory: 0,
      Logistics: 0,
      Marketing: 0,
      Miscellaneous: 0
    };

    inPeriod.forEach(entry => {
      const cat = entry.category || 'Miscellaneous';
      if (catMap[cat] !== undefined) {
        catMap[cat] += entry.amount;
      } else {
        catMap.Miscellaneous += entry.amount;
      }
    });

    return Object.entries(catMap)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: ''
      }));
  }, [allEntriesSortedWithBalance, startDate, endDate]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Finance & Accounting</h1>
          <p className={styles.subtitle}>
            Comprehensive P&L overview, cash flow analytics, and double-entry transaction ledger.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={() => setShowIncomeModal(true)}
            className={styles.btnSecondary}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowUpRight size={15} color="var(--color-success)" />
            Add Income
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className={styles.btnPrimary}
            style={{ backgroundColor: 'var(--color-danger)' }}
          >
            <ArrowDownLeft size={15} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className={styles.dateBar}>
        <div className={styles.presetGroup}>
          <Calendar size={15} color="var(--color-muted-text)" style={{ marginRight: 4 }} />
          <button
            onClick={() => setPreset('today')}
            className={`${styles.presetBtn} ${preset === 'today' ? styles.presetBtnActive : ''}`}
          >
            Today
          </button>
          <button
            onClick={() => setPreset('7d')}
            className={`${styles.presetBtn} ${preset === '7d' ? styles.presetBtnActive : ''}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPreset('30d')}
            className={`${styles.presetBtn} ${preset === '30d' ? styles.presetBtnActive : ''}`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPreset('thisMonth')}
            className={`${styles.presetBtn} ${preset === 'thisMonth' ? styles.presetBtnActive : ''}`}
          >
            This Month
          </button>
          <button
            onClick={() => setPreset('lastMonth')}
            className={`${styles.presetBtn} ${preset === 'lastMonth' ? styles.presetBtnActive : ''}`}
          >
            Last Month
          </button>
          <button
            onClick={() => setPreset('thisFY')}
            className={`${styles.presetBtn} ${preset === 'thisFY' ? styles.presetBtnActive : ''}`}
          >
            This Financial Year
          </button>
          <button
            onClick={() => setPreset('custom')}
            className={`${styles.presetBtn} ${preset === 'custom' ? styles.presetBtnActive : ''}`}
          >
            Custom
          </button>
        </div>

        {preset === 'custom' && (
          <div className={styles.customDateGroup}>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className={styles.dateInput}
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        )}
      </div>

      {/* P&L Financial Summary Row */}
      <FinanceSummaryRow metrics={summaryMetrics} />

      {/* Financial Charts */}
      <FinanceCharts timelineData={timelineData} categoryData={categoryData} />

      {/* Ledger Table */}
      <LedgerTable
        entriesWithBalance={inPeriodEntriesWithBalance}
        dateRangeLabel={dateRangeLabel}
      />

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => {
            setShowExpenseModal(false);
            if (searchParams.get('add')) {
              searchParams.delete('add');
              setSearchParams(searchParams);
            }
          }}
        />
      )}

      {/* Add Income Modal */}
      {showIncomeModal && (
        <AddIncomeModal onClose={() => setShowIncomeModal(false)} />
      )}
    </div>
  );
};
