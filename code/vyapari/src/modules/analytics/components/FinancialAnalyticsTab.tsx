import React, { useMemo, useState } from 'react';
import { useStore } from '../../../services/store';
import type { AnalyticsFilterState, ComparisonDateRanges } from '../types';
import {
  isDateInInterval,
  computeDelta,
  formatINR,
  formatCompactINR
} from '../utils/analyticsHelpers';
import styles from '../styles/analytics.module.css';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  PieChart as PieIcon,
  CreditCard,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Props {
  filter: AnalyticsFilterState;
  dateRanges: ComparisonDateRanges;
}

export const FinancialAnalyticsTab: React.FC<Props> = ({ filter, dateRanges }) => {
  const sales = useStore(state => state.sales);
  const expenses = useStore(state => state.expenses);
  const invoices = useStore(state => state.invoices);
  const payrollRuns = useStore(state => state.payrollRuns);

  const [seriesVisible, setSeriesVisible] = useState({
    revenue: true,
    expenses: true,
    profit: true
  });

  const toggleSeries = (key: keyof typeof seriesVisible) => {
    setSeriesVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute Comprehensive Financial Aggregations
  const {
    currentFinancials,
    priorFinancials,
    trendData,
    expenseBreakdown,
    agingBuckets,
    collectionStats
  } = useMemo(() => {
    // Helper to check outlet
    const matchOutlet = (outletId?: string) => {
      if (filter.outletId === 'all') return true;
      if (!outletId) return true;
      return outletId === filter.outletId;
    };

    // 1. Current Period Sales & Revenue
    let currRevenue = 0;
    const currSalesMap = new Map<string, number>();

    sales.forEach(s => {
      if (isDateInInterval(s.createdAt, dateRanges.current.startDate, dateRanges.current.endDate)) {
        if (matchOutlet(s.outletId)) {
          currRevenue += s.total;
          const d = format(new Date(s.createdAt), 'MMM dd');
          currSalesMap.set(d, (currSalesMap.get(d) || 0) + s.total);
        }
      }
    });

    // 2. Prior Period Sales & Revenue
    let priorRevenue = 0;
    sales.forEach(s => {
      if (isDateInInterval(s.createdAt, dateRanges.prior.startDate, dateRanges.prior.endDate)) {
        if (matchOutlet(s.outletId)) {
          priorRevenue += s.total;
        }
      }
    });

    // 3. Current & Prior Expenses by Category
    const currExpMap = new Map<string, number>();
    const priorExpMap = new Map<string, number>();
    const currDailyExpMap = new Map<string, number>();

    let currTotalExp = 0;
    let priorTotalExp = 0;

    // Direct Expenses
    expenses.forEach(e => {
      const expDate = e.date || e.createdAt || '';
      if (isDateInInterval(expDate, dateRanges.current.startDate, dateRanges.current.endDate)) {
        if (matchOutlet(e.outletId)) {
          const cat = e.category || 'Miscellaneous';
          currExpMap.set(cat, (currExpMap.get(cat) || 0) + e.amount);
          currTotalExp += e.amount;

          const d = format(new Date(expDate), 'MMM dd');
          currDailyExpMap.set(d, (currDailyExpMap.get(d) || 0) + e.amount);
        }
      }

      if (isDateInInterval(expDate, dateRanges.prior.startDate, dateRanges.prior.endDate)) {
        if (matchOutlet(e.outletId)) {
          const cat = e.category || 'Miscellaneous';
          priorExpMap.set(cat, (priorExpMap.get(cat) || 0) + e.amount);
          priorTotalExp += e.amount;
        }
      }
    });

    // Payroll entries (if applicable in window)
    payrollRuns.forEach(pr => {
      if (pr.status === 'paid' && pr.calculatedAt) {
        if (isDateInInterval(pr.calculatedAt, dateRanges.current.startDate, dateRanges.current.endDate)) {
          currExpMap.set('Salaries', (currExpMap.get('Salaries') || 0) + pr.totalAmount);
          currTotalExp += pr.totalAmount;
        }
        if (isDateInInterval(pr.calculatedAt, dateRanges.prior.startDate, dateRanges.prior.endDate)) {
          priorExpMap.set('Salaries', (priorExpMap.get('Salaries') || 0) + pr.totalAmount);
          priorTotalExp += pr.totalAmount;
        }
      }
    });

    const currNetProfit = currRevenue - currTotalExp;
    const priorNetProfit = priorRevenue - priorTotalExp;
    const currMargin = currRevenue > 0 ? (currNetProfit / currRevenue) * 100 : 0;
    const priorMargin = priorRevenue > 0 ? (priorNetProfit / priorRevenue) * 100 : 0;

    // Trend chart time buckets
    const allDates = Array.from(new Set([...currSalesMap.keys(), ...currDailyExpMap.keys()]));
    const trendList = allDates.map(d => {
      const rev = currSalesMap.get(d) || 0;
      const exp = currDailyExpMap.get(d) || 0;
      const profit = rev - exp;
      return {
        date: d,
        revenue: rev,
        expenses: exp,
        profit,
        margin: rev > 0 ? Math.round((profit / rev) * 100) : 0
      };
    });

    // Granular Expense Categories Breakdown
    const standardCategories = ['Rent', 'Salaries', 'Utilities', 'Inventory', 'Logistics', 'Marketing', 'Miscellaneous'];
    const allCatKeys = Array.from(new Set([...standardCategories, ...currExpMap.keys()]));

    const expenseTable = allCatKeys
      .map(cat => {
        const currentAmount = currExpMap.get(cat) || 0;
        const priorAmount = priorExpMap.get(cat) || 0;
        const share = currTotalExp > 0 ? (currentAmount / currTotalExp) * 100 : 0;
        const delta = computeDelta(currentAmount, priorAmount);

        return {
          category: cat,
          currentAmount,
          priorAmount,
          sharePct: Math.round(share * 10) / 10,
          delta
        };
      })
      .filter(item => item.currentAmount > 0 || item.priorAmount > 0)
      .sort((a, b) => b.currentAmount - a.currentAmount);

    // Aging Buckets for Invoices / Receivables
    const now = new Date();
    const aging = [
      { label: '0–15 Days (Current)', min: 0, max: 15, count: 0, amount: 0, status: 'current' },
      { label: '16–30 Days', min: 16, max: 30, count: 0, amount: 0, status: 'warning' },
      { label: '31–60 Days (Overdue)', min: 31, max: 60, count: 0, amount: 0, status: 'danger' },
      { label: '60+ Days (Critical)', min: 61, max: 9999, count: 0, amount: 0, status: 'critical' }
    ];

    let totalInvoices = 0;
    let paidInvoices = 0;
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
      totalInvoices += 1;
      totalBilled += inv.amount;

      if (inv.status === 'paid') {
        paidInvoices += 1;
        totalCollected += inv.amount;
      } else {
        const outstanding = inv.amount - (inv.amountPaid || 0);
        totalOutstanding += outstanding;

        const ageDays = differenceInDays(now, new Date(inv.createdAt));
        const bucket = aging.find(b => ageDays >= b.min && ageDays <= b.max) || aging[3];
        bucket.count += 1;
        bucket.amount += outstanding;
      }
    });

    const collectionEfficiency = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

    return {
      currentFinancials: {
        revenue: currRevenue,
        expenses: currTotalExp,
        netProfit: currNetProfit,
        margin: currMargin,
        receivables: totalOutstanding
      },
      priorFinancials: {
        revenue: priorRevenue,
        expenses: priorTotalExp,
        netProfit: priorNetProfit,
        margin: priorMargin
      },
      trendData: trendList,
      expenseBreakdown: expenseTable,
      agingBuckets: aging,
      collectionStats: {
        totalInvoices,
        paidInvoices,
        totalBilled,
        totalCollected,
        totalOutstanding,
        collectionEfficiency
      }
    };
  }, [sales, expenses, payrollRuns, invoices, filter, dateRanges]);

  const revDelta = computeDelta(currentFinancials.revenue, priorFinancials.revenue);
  const expDelta = computeDelta(currentFinancials.expenses, priorFinancials.expenses);
  const profitDelta = computeDelta(currentFinancials.netProfit, priorFinancials.netProfit);

  // Custom Financial Tooltip
  const CustomFinancialTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipTitle}>{label}</div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Total Revenue:</span>
            <span className={styles.tooltipValue} style={{ color: 'var(--color-primary)' }}>
              {formatINR(d.revenue)}
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Operating Expenses:</span>
            <span className={styles.tooltipValue} style={{ color: 'var(--color-danger)' }}>
              {formatINR(d.expenses)}
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Net Operating Profit:</span>
            <span
              className={styles.tooltipValue}
              style={{ color: d.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {formatINR(d.profit)} ({d.margin}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDelta = (delta: { percent: number; isPositive: boolean; isNeutral: boolean }, invertColor = false) => {
    if (!filter.comparePrior) return null;
    const isGood = invertColor ? !delta.isPositive : delta.isPositive;
    const badgeClass = delta.isNeutral
      ? styles.deltaNeutral
      : isGood
      ? styles.deltaPositive
      : styles.deltaNegative;
    const Icon = delta.isNeutral ? Minus : delta.isPositive ? TrendingUp : TrendingDown;

    return (
      <div className={styles.kpiFooter}>
        <span className={`${styles.deltaBadge} ${badgeClass}`}>
          <Icon size={12} />
          <span>{delta.percent > 0 ? `+${delta.percent}%` : `${delta.percent}%`}</span>
        </span>
        <span className={styles.deltaSubtext}>vs prior period</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      {/* 4 Financial KPI Summary Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Gross Revenue</span>
            <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className={styles.kpiValue}>{formatINR(currentFinancials.revenue)}</div>
          {renderDelta(revDelta)}
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Operating Expenses</span>
            <Building size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-danger)' }}>
            {formatINR(currentFinancials.expenses)}
          </div>
          {renderDelta(expDelta, true)}
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Net Operating Profit</span>
            <PieIcon size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div
            className={styles.kpiValue}
            style={{
              color: currentFinancials.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
            }}
          >
            {formatINR(currentFinancials.netProfit)}{' '}
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              ({Math.round(currentFinancials.margin)}%)
            </span>
          </div>
          {renderDelta(profitDelta)}
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Outstanding Receivables</span>
            <CreditCard size={18} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-warning)' }}>
            {formatINR(currentFinancials.receivables)}
          </div>
          <div className={styles.deltaSubtext}>
            {collectionStats.collectionEfficiency}% Cash Collection Efficiency
          </div>
        </div>
      </div>

      {/* Comparative Revenue vs Expenses vs Net Profit Trajectory */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <h3 className={styles.cardTitle}>Comparative P&L Trajectory & Net Operating Margin</h3>
            <span className={styles.cardSubtitle}>
              Multi-series comparison of daily operational cash inflow, overhead outflow, and net bottom-line profit
            </span>
          </div>

          <div className={styles.legendToggleGroup}>
            <span
              className={`${styles.legendItem} ${
                seriesVisible.revenue ? styles.legendItemActive : styles.legendItemInactive
              }`}
              onClick={() => toggleSeries('revenue')}
            >
              <span className={styles.legendDot} style={{ background: 'var(--color-primary)' }} />
              Revenue (₹)
            </span>
            <span
              className={`${styles.legendItem} ${
                seriesVisible.expenses ? styles.legendItemActive : styles.legendItemInactive
              }`}
              onClick={() => toggleSeries('expenses')}
            >
              <span className={styles.legendDot} style={{ background: 'var(--color-danger)' }} />
              Expenses (₹)
            </span>
            <span
              className={`${styles.legendItem} ${
                seriesVisible.profit ? styles.legendItemActive : styles.legendItemInactive
              }`}
              onClick={() => toggleSeries('profit')}
            >
              <span className={styles.legendDot} style={{ background: 'var(--color-success)' }} />
              Net Profit (₹)
            </span>
          </div>
        </div>

        <div style={{ height: 340, width: '100%', marginTop: 8 }}>
          {trendData.length === 0 ? (
            <div className={styles.emptyStateContainer} style={{ height: '100%', border: 'none' }}>
              No financial ledger entries in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={val => formatCompactINR(val)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                <Tooltip content={<CustomFinancialTooltip />} />

                {seriesVisible.revenue && (
                  <Bar
                    dataKey="revenue"
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    opacity={0.85}
                  />
                )}
                {seriesVisible.expenses && (
                  <Bar
                    dataKey="expenses"
                    fill="var(--color-danger)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    opacity={0.8}
                  />
                )}
                {seriesVisible.profit && (
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--color-success)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--color-success)' }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2-Column: Expense Breakdown Table & Receivables Aging Analysis */}
      <div className={styles.chartGridEqual}>
        {/* Granular Expense Breakdown Table */}
        <div className={styles.analyticsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBlock}>
              <h3 className={styles.cardTitle}>Operating Expense Categorization</h3>
              <span className={styles.cardSubtitle}>
                Cost breakdown by overhead bucket with period-over-period variance
              </span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.analyticsTable}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className={styles.textRight}>Current Spend</th>
                  <th style={{ width: 110 }}>% Share</th>
                  <th className={styles.textRight}>MoM Change</th>
                </tr>
              </thead>
              <tbody>
                {expenseBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.textCenter} style={{ padding: 20, color: 'var(--color-muted-text)' }}>
                      No expenses logged in this window.
                    </td>
                  </tr>
                ) : (
                  expenseBreakdown.map(item => (
                    <tr key={item.category}>
                      <td style={{ fontWeight: 600 }}>{item.category}</td>
                      <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700 }}>
                        {formatINR(item.currentAmount)}
                      </td>
                      <td>
                        <div className={styles.barContainer}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFill}
                              style={{ width: `${item.sharePct}%`, background: 'var(--color-danger)' }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {item.sharePct}%
                          </span>
                        </div>
                      </td>
                      <td className={`${styles.textRight} tabular-nums`}>
                        {filter.comparePrior ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: item.delta.isPositive ? 'var(--color-danger)' : 'var(--color-success)'
                            }}
                          >
                            {item.delta.percent > 0 ? `+${item.delta.percent}%` : `${item.delta.percent}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receivables Aging Analysis */}
        <div className={styles.analyticsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBlock}>
              <h3 className={styles.cardTitle}>Receivables Aging & Recovery Risk</h3>
              <span className={styles.cardSubtitle}>
                Outstanding invoice maturity distribution across overdue brackets
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agingBuckets.map(b => {
              const totalRec = currentFinancials.receivables || 1;
              const share = Math.round((b.amount / totalRec) * 100);

              return (
                <div
                  key={b.label}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock
                        size={14}
                        style={{
                          color:
                            b.status === 'critical'
                              ? 'var(--color-danger)'
                              : b.status === 'danger'
                              ? 'var(--color-warning)'
                              : 'var(--color-primary)'
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
                        {formatINR(b.amount)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-muted-text)', marginLeft: 6 }}>
                        ({b.count} invoices)
                      </span>
                    </div>
                  </div>

                  <div className={styles.barContainer}>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${Math.min(100, share)}%`,
                          background:
                            b.status === 'critical'
                              ? 'var(--color-danger)'
                              : b.status === 'danger'
                              ? 'var(--color-warning)'
                              : 'var(--color-primary)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {share}% of total debt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(91, 122, 91, 0.08)',
              border: '1px solid rgba(91, 122, 91, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>
                Cash Collection Rate: {collectionStats.collectionEfficiency}%
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
              {collectionStats.paidInvoices} of {collectionStats.totalInvoices} Invoices Settled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
