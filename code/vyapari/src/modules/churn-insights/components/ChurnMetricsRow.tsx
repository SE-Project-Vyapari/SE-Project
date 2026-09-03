import React from 'react';
import { AlertCircle, AlertTriangle, TrendingUp, IndianRupee } from 'lucide-react';
import styles from '../styles/churn-insights.module.css';

interface ChurnMetricsRowProps {
  highRiskCount: number;
  mediumRiskCount: number;
  positiveTrendCount: number;
  revenueAtRisk: number;
  onSelectRiskFilter?: (filter: string) => void;
}

export const ChurnMetricsRow: React.FC<ChurnMetricsRowProps> = ({
  highRiskCount,
  mediumRiskCount,
  positiveTrendCount,
  revenueAtRisk,
  onSelectRiskFilter
}) => {
  return (
    <div className={styles.metricsGrid}>
      {/* High Risk Card */}
      <div
        className={styles.metricCard}
        style={{ borderLeft: '4px solid var(--color-danger)', cursor: onSelectRiskFilter ? 'pointer' : 'default' }}
        onClick={() => onSelectRiskFilter && onSelectRiskFilter('high')}
      >
        <div className={styles.metricTop}>
          <span className={styles.metricLabel}>High Risk Customers</span>
          <div className={styles.metricIconWrapper} style={{ backgroundColor: 'rgba(184, 74, 62, 0.15)', color: 'var(--color-danger)' }}>
            <AlertCircle size={20} />
          </div>
        </div>
        <div className={styles.metricValue} style={{ color: 'var(--color-danger)' }}>
          {highRiskCount}
        </div>
        <div className={styles.metricSubtext}>
          Significantly overdue past typical reorder cycle
        </div>
      </div>

      {/* Medium Risk Card */}
      <div
        className={styles.metricCard}
        style={{ borderLeft: '4px solid var(--color-warning)', cursor: onSelectRiskFilter ? 'pointer' : 'default' }}
        onClick={() => onSelectRiskFilter && onSelectRiskFilter('medium')}
      >
        <div className={styles.metricTop}>
          <span className={styles.metricLabel}>Medium Risk Customers</span>
          <div className={styles.metricIconWrapper} style={{ backgroundColor: 'rgba(184, 134, 59, 0.15)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={20} />
          </div>
        </div>
        <div className={styles.metricValue} style={{ color: 'var(--color-warning)' }}>
          {mediumRiskCount}
        </div>
        <div className={styles.metricSubtext}>
          Moderately overdue — prompt reorder reminder needed
        </div>
      </div>

      {/* Trending Positively Card */}
      <div
        className={styles.metricCard}
        style={{ borderLeft: '4px solid var(--color-success)', cursor: onSelectRiskFilter ? 'pointer' : 'default' }}
        onClick={() => onSelectRiskFilter && onSelectRiskFilter('low')}
      >
        <div className={styles.metricTop}>
          <span className={styles.metricLabel}>Trending Positively</span>
          <div className={styles.metricIconWrapper} style={{ backgroundColor: 'rgba(91, 122, 91, 0.15)', color: 'var(--color-success)' }}>
            <TrendingUp size={20} />
          </div>
        </div>
        <div className={styles.metricValue} style={{ color: 'var(--color-success)' }}>
          {positiveTrendCount}
        </div>
        <div className={styles.metricSubtext}>
          Repurchasing on schedule or faster than usual
        </div>
      </div>

      {/* Estimated Revenue at Risk */}
      <div
        className={styles.metricCard}
        style={{ borderLeft: '4px solid var(--color-primary)' }}
      >
        <div className={styles.metricTop}>
          <span className={styles.metricLabel}>Est. Revenue at Risk</span>
          <div className={styles.metricIconWrapper} style={{ backgroundColor: 'rgba(198, 93, 58, 0.15)', color: 'var(--color-primary)' }}>
            <IndianRupee size={20} />
          </div>
        </div>
        <div className={`${styles.metricValue} tabular-nums`} style={{ color: 'var(--color-primary)' }}>
          ₹{revenueAtRisk.toLocaleString('en-IN')}
        </div>
        <div className={styles.metricSubtext}>
          Calculated value of at-risk repurchase volume
        </div>
      </div>
    </div>
  );
};
