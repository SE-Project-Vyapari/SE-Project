import React, { useState, useMemo } from 'react';
import { useStore } from '../../../services/store';
import { PredictionBadge } from '../../../components/ui/PredictionBadge';
import styles from '../styles/forecasting.module.css';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { addDays, format, subDays, isAfter } from 'date-fns';

interface Props {
  selectedOutlet: string;
}

export const CashFlowForecastTab: React.FC<Props> = ({ selectedOutlet }) => {
  const sales = useStore(state => state.sales);
  const expenses = useStore(state => state.expenses);
  const payrollRuns = useStore(state => state.payrollRuns);

  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [safetyThreshold, setSafetyThreshold] = useState<number>(50000);

  // Compute Current Cash Balance & Historical Run-Rates
  const {
    currentCashPosition,
    dailyInflowRate,
    projectedData,
    weeklyBreakdown,
    shortfallEvent
  } = useMemo(() => {
    // 1. Calculate historical 30-day velocity
    const now = new Date();
    const past30d = subDays(now, 30);

    let past30Sales = 0;
    sales.forEach(s => {
      if (isAfter(new Date(s.createdAt), past30d)) {
        if (selectedOutlet === 'all' || s.outletId === selectedOutlet) {
          past30Sales += s.total;
        }
      }
    });

    let past30Expenses = 0;
    expenses.forEach(e => {
      const d = e.date || e.createdAt || '';
      if (d && isAfter(new Date(d), past30d)) {
        if (selectedOutlet === 'all' || e.outletId === selectedOutlet) {
          past30Expenses += e.amount;
        }
      }
    });

    // Add recent paid payroll
    payrollRuns.forEach(pr => {
      if (pr.status === 'paid' && pr.calculatedAt && isAfter(new Date(pr.calculatedAt), past30d)) {
        past30Expenses += pr.totalAmount;
      }
    });

    // Daily averages
    const avgDailyInflow = past30Sales > 0 ? past30Sales / 30 : 12500;
    const avgDailyOutflow = past30Expenses > 0 ? past30Expenses / 30 : 7200;

    // Estimate starting cash position from all-time sales minus expenses
    let allTimeSales = 0;
    sales.forEach(s => {
      if (selectedOutlet === 'all' || s.outletId === selectedOutlet) allTimeSales += s.total;
    });

    let allTimeExpenses = 0;
    expenses.forEach(e => {
      if (selectedOutlet === 'all' || e.outletId === selectedOutlet) allTimeExpenses += e.amount;
    });
    payrollRuns.forEach(pr => {
      if (pr.status === 'paid') allTimeExpenses += pr.totalAmount;
    });

    const startingCash = Math.max(75000, allTimeSales - allTimeExpenses);

    // 2. Project forward day by day
    let runningBalance = startingCash;
    let shortfallDate: string | null = null;
    let shortfallAmount = 0;

    const dailyProjections = [];

    for (let d = 1; d <= horizonDays; d++) {
      const dateObj = addDays(now, d);
      const dateStr = format(dateObj, 'MMM dd');

      // Add day of week variability (higher weekend sales)
      const dayOfWeek = dateObj.getDay();
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.35 : 0.9;
      const inflow = Math.round(avgDailyInflow * weekendFactor);

      // Monthly rent / payroll spikes on 1st & 15th
      let outflow = Math.round(avgDailyOutflow * 0.7);
      if (dateObj.getDate() === 1) {
        outflow += 25000; // Rent spike
      }
      if (dateObj.getDate() === 5 || dateObj.getDate() === 28) {
        outflow += 35000; // Payroll cycle
      }

      runningBalance += inflow - outflow;

      if (runningBalance < safetyThreshold && !shortfallDate) {
        shortfallDate = format(dateObj, 'MMM dd, yyyy');
        shortfallAmount = safetyThreshold - runningBalance;
      }

      dailyProjections.push({
        date: dateStr,
        fullDate: format(dateObj, 'yyyy-MM-dd'),
        inflow,
        outflow,
        net: inflow - outflow,
        projectedBalance: Math.round(runningBalance)
      });
    }

    // 3. Weekly Rollup
    const weeks = [];
    const numWeeks = Math.ceil(horizonDays / 7);

    for (let w = 0; w < numWeeks; w++) {
      const slice = dailyProjections.slice(w * 7, (w + 1) * 7);
      if (slice.length > 0) {
        const wInflow = slice.reduce((sum, item) => sum + item.inflow, 0);
        const wOutflow = slice.reduce((sum, item) => sum + item.outflow, 0);
        const endingBal = slice[slice.length - 1].projectedBalance;

        weeks.push({
          weekNumber: w + 1,
          dateRange: `${slice[0].date} – ${slice[slice.length - 1].date}`,
          inflow: wInflow,
          outflow: wOutflow,
          netChange: wInflow - wOutflow,
          endingBalance: endingBal,
          isBelowSafety: endingBal < safetyThreshold
        });
      }
    }

    return {
      currentCashPosition: startingCash,
      dailyInflowRate: Math.round(avgDailyInflow),
      projectedData: dailyProjections,
      weeklyBreakdown: weeks,
      shortfallEvent: shortfallDate ? { date: shortfallDate, deficit: shortfallAmount } : null
    };
  }, [sales, expenses, payrollRuns, selectedOutlet, horizonDays, safetyThreshold]);

  const totalProjectedInflow = projectedData.reduce((sum, d) => sum + d.inflow, 0);
  const totalProjectedOutflow = projectedData.reduce((sum, d) => sum + d.outflow, 0);
  const endingProjectedBalance =
    projectedData.length > 0 ? projectedData[projectedData.length - 1].projectedBalance : currentCashPosition;
  const netProjectedCashflow = totalProjectedInflow - totalProjectedOutflow;

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Math.round(val)
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      {/* 4 Summary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Current Cash Balance</span>
            <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className={styles.kpiValue}>{formatINR(currentCashPosition)}</div>
          <div className={styles.kpiFooter}>
            <span>Estimated baseline operational cash</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Projected Inflow ({horizonDays}d)</span>
            <ArrowUpRight size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>
            +{formatINR(totalProjectedInflow)}
          </div>
          <div className={styles.kpiFooter}>
            <span>Avg {formatINR(dailyInflowRate)} / day from POS & sales</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Projected Outflow ({horizonDays}d)</span>
            <ArrowDownRight size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-danger)' }}>
            -{formatINR(totalProjectedOutflow)}
          </div>
          <div className={styles.kpiFooter}>
            <span>Rent, payroll, and scheduled overheads</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Projected Ending Balance</span>
            <TrendingUp size={18} style={{ color: endingProjectedBalance >= safetyThreshold ? 'var(--color-success)' : 'var(--color-danger)' }} />
          </div>
          <div
            className={styles.kpiValue}
            style={{ color: endingProjectedBalance >= safetyThreshold ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {formatINR(endingProjectedBalance)}
          </div>
          <div className={styles.kpiFooter}>
            <PredictionBadge variant="advisory" size="sm" />
            <span>Net {netProjectedCashflow >= 0 ? '+' : ''}{formatINR(netProjectedCashflow)}</span>
          </div>
        </div>
      </div>

      {/* Safety Shortfall Alert Banner */}
      {shortfallEvent ? (
        <div className={`${styles.alertBanner} ${styles.alertDanger}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldAlert size={22} style={{ color: 'var(--color-danger)' }} />
            <div>
              <strong>Potential Cash-Flow Shortfall Alert:</strong> Projected cash balance may fall below your
              safety threshold (<strong>{formatINR(safetyThreshold)}</strong>) around{' '}
              <strong>{shortfallEvent.date}</strong>.
              <div style={{ fontSize: 12, marginTop: 2, color: '#721C24' }}>
                Consider accelerating invoice collections or reviewing discretionary operational disbursements.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles.alertBanner} ${styles.alertSuccess}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
            <div>
              <strong>Healthy Liquidity Position:</strong> Projected cash balance remains safely above your{' '}
              <strong>{formatINR(safetyThreshold)}</strong> threshold across the entire {horizonDays}-day horizon.
            </div>
          </div>
        </div>
      )}

      {/* Controls Toolbar */}
      <div className={styles.toolbarRow}>
        <div className={styles.toolbarGroup}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
            Forecast Horizon:
          </span>
          <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {[7, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setHorizonDays(days)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: horizonDays === days ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: horizonDays === days ? '#fff' : 'var(--color-text)',
                  transition: 'all 0.15s ease'
                }}
              >
                {days} Days
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', textTransform: 'uppercase', marginLeft: 16 }}>
            Safety Threshold (₹):
          </span>
          <input
            type="number"
            className={styles.toolbarInput}
            value={safetyThreshold}
            onChange={e => setSafetyThreshold(Math.max(0, Number(e.target.value)))}
            style={{ width: 120, fontWeight: 600 }}
            step={5000}
          />
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-muted-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <PredictionBadge variant="advisory" />
          <span>Non-binding cash burn trajectory based on 30-day velocity</span>
        </div>
      </div>

      {/* Cash-Flow Trajectory Chart */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <h3 className={styles.cardTitle}>Projected Daily Cash Balance & Operating Velocity</h3>
            <span className={styles.cardSubtitle}>
              Dual-series trajectory showing daily inflows, outflows, and cumulative cash reserves against safety threshold
            </span>
          </div>
        </div>

        <div style={{ height: 340, width: '100%', marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projectedData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
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
                tickFormatter={val => `₹${Math.round(val / 1000)}k`}
                tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
              />
              <Tooltip
                formatter={(val: any, name: any) => [formatINR(Number(val)), name]}
                contentStyle={{
                  background: '#252321',
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: 12,
                  border: 'none'
                }}
              />
              <ReferenceLine
                y={safetyThreshold}
                stroke="#B84A3E"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Safety Threshold: ${formatINR(safetyThreshold)}`,
                  position: 'insideTopRight',
                  fill: '#B84A3E',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />

              <Bar dataKey="inflow" name="Projected Inflow" fill="var(--color-success)" opacity={0.75} maxBarSize={16} />
              <Bar dataKey="outflow" name="Projected Outflow" fill="var(--color-danger)" opacity={0.75} maxBarSize={16} />
              <Line
                type="monotone"
                dataKey="projectedBalance"
                name="Projected Balance"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 2, fill: 'var(--color-primary)' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Breakdown Table */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <h3 className={styles.cardTitle}>Weekly Projected Cash-Flow Breakdown</h3>
            <span className={styles.cardSubtitle}>
              Aggregated weekly operational liquidity milestones and safety variance
            </span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.forecastTable}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Calendar Window</th>
                <th className={styles.textRight}>Projected Inflow</th>
                <th className={styles.textRight}>Projected Outflow</th>
                <th className={styles.textRight}>Net Weekly Flow</th>
                <th className={styles.textRight}>Ending Balance</th>
                <th style={{ textAlign: 'center' }}>Safety Status</th>
              </tr>
            </thead>
            <tbody>
              {weeklyBreakdown.map(wb => (
                <tr key={wb.weekNumber}>
                  <td style={{ fontWeight: 600 }}>Week {wb.weekNumber}</td>
                  <td style={{ color: 'var(--color-muted-text)' }}>{wb.dateRange}</td>
                  <td className={`${styles.textRight} tabular-nums`} style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    +{formatINR(wb.inflow)}
                  </td>
                  <td className={`${styles.textRight} tabular-nums`} style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                    -{formatINR(wb.outflow)}
                  </td>
                  <td
                    className={`${styles.textRight} tabular-nums`}
                    style={{ fontWeight: 700, color: wb.netChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                  >
                    {wb.netChange >= 0 ? '+' : ''}{formatINR(wb.netChange)}
                  </td>
                  <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700 }}>
                    {formatINR(wb.endingBalance)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {wb.isBelowSafety ? (
                      <span className={`${styles.confidenceBadge} ${styles.confidenceLow}`}>
                        ⚠️ Below Threshold
                      </span>
                    ) : (
                      <span className={`${styles.confidenceBadge} ${styles.confidenceHigh}`}>
                        ✓ Safe Reserve
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
