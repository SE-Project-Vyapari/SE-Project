import React from 'react';
import { formatINR } from '../../../utils/format';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import styles from '../styles/finance.module.css';

interface FinanceSummaryMetrics {
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  receivables: number;
  payables: number;
  cashPosition: number;
}

interface FinanceSummaryRowProps {
  metrics: FinanceSummaryMetrics;
}

export const FinanceSummaryRow: React.FC<FinanceSummaryRowProps> = ({ metrics }) => {
  const isNetProfitPositive = metrics.netProfit >= 0;
  const isGrossProfitPositive = metrics.grossProfit >= 0;
  const isCashPositive = metrics.cashPosition >= 0;

  return (
    <div className={styles.summaryGrid}>
      {/* 1. Revenue */}
      <div className={styles.summaryCard} style={{ borderLeft: '4px solid var(--color-success)' }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Revenue</span>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(91, 122, 91, 0.15)', color: 'var(--color-success)' }}>
            <ArrowUpRight size={18} />
          </div>
        </div>
        <div className={`${styles.cardValue} tabular-nums`} style={{ color: 'var(--color-dark)' }}>
          {formatINR(metrics.revenue)}
        </div>
        <div className={styles.cardSubtext}>
          Total sales & recognized income in period
        </div>
      </div>

      {/* 2. Expenses */}
      <div className={styles.summaryCard} style={{ borderLeft: '4px solid var(--color-danger)' }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Expenses</span>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(184, 74, 62, 0.15)', color: 'var(--color-danger)' }}>
            <ArrowDownLeft size={18} />
          </div>
        </div>
        <div className={`${styles.cardValue} tabular-nums`} style={{ color: 'var(--color-dark)' }}>
          {formatINR(metrics.expenses)}
        </div>
        <div className={styles.cardSubtext}>
          Total operating & procurement debits
        </div>
      </div>

      {/* 3. Gross Profit */}
      <div className={styles.summaryCard} style={{ borderLeft: `4px solid ${isGrossProfitPositive ? 'var(--color-primary)' : 'var(--color-danger)'}` }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Gross Profit</span>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(198, 93, 58, 0.15)', color: 'var(--color-primary)' }}>
            <PieChart size={18} />
          </div>
        </div>
        <div
          className={`${styles.cardValue} tabular-nums`}
          style={{ color: isGrossProfitPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {formatINR(metrics.grossProfit)}
        </div>
        <div className={styles.cardSubtext}>
          Revenue minus direct product costs (COGS)
        </div>
      </div>

      {/* 4. Net Profit */}
      <div className={styles.summaryCard} style={{ borderLeft: `4px solid ${isNetProfitPositive ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Net Profit</span>
          <div
            className={styles.cardIcon}
            style={{
              backgroundColor: isNetProfitPositive ? 'rgba(91, 122, 91, 0.15)' : 'rgba(184, 74, 62, 0.15)',
              color: isNetProfitPositive ? 'var(--color-success)' : 'var(--color-danger)'
            }}
          >
            {isNetProfitPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
        <div
          className={`${styles.cardValue} tabular-nums`}
          style={{ color: isNetProfitPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {formatINR(metrics.netProfit)}
        </div>
        <div className={styles.cardSubtext}>
          {isNetProfitPositive ? 'Net profit margin positive' : 'Net loss over period'}
        </div>
      </div>

      {/* 5. Receivables */}
      <div className={styles.summaryCard} style={{ borderLeft: '4px solid var(--color-warning)' }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Receivables</span>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(184, 134, 59, 0.15)', color: 'var(--color-warning)' }}>
            <Clock size={18} />
          </div>
        </div>
        <div className={`${styles.cardValue} tabular-nums`} style={{ color: 'var(--color-dark)' }}>
          {formatINR(metrics.receivables)}
        </div>
        <div className={styles.cardSubtext}>
          Unpaid / partial customer invoice balances
        </div>
      </div>

      {/* 6. Payables */}
      <div className={styles.summaryCard} style={{ borderLeft: '4px solid var(--color-muted-text)' }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Payables</span>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(100, 100, 100, 0.15)', color: 'var(--color-text)' }}>
            <DollarSign size={18} />
          </div>
        </div>
        <div className={`${styles.cardValue} tabular-nums`} style={{ color: 'var(--color-dark)' }}>
          {formatINR(metrics.payables)}
        </div>
        <div className={styles.cardSubtext} title={metrics.payables === 0 ? 'Supplier bills tracking active upon bill receipt' : 'Pending supplier bills'}>
          {metrics.payables === 0 ? '₹0 (all logged supplier bills settled)' : 'Pending supplier bills'}
        </div>
      </div>

      {/* 7. Cash Position */}
      <div className={styles.summaryCard} style={{ borderLeft: `4px solid ${isCashPositive ? 'var(--color-primary)' : 'var(--color-danger)'}` }}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Cash Position</span>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(198, 93, 58, 0.15)', color: 'var(--color-primary)' }}>
            <Wallet size={18} />
          </div>
        </div>
        <div
          className={`${styles.cardValue} tabular-nums`}
          style={{ color: isCashPositive ? 'var(--color-dark)' : 'var(--color-danger)' }}
        >
          {formatINR(metrics.cashPosition)}
        </div>
        <div className={styles.cardSubtext}>
          Cumulative ledger running balance to date
        </div>
      </div>
    </div>
  );
};
