import React from 'react';
import { Activity, Info } from 'lucide-react';
import styles from '../styles/crm.module.css';

interface ChurnInsightsCardProps {
  orderCount: number;
  totalSpent: number;
  lastPurchaseDate?: string;
}

export const ChurnInsightsCard: React.FC<ChurnInsightsCardProps> = ({
  orderCount,
  totalSpent,
  lastPurchaseDate
}) => {
  // Compute basic RFM churn score (0 - 100)
  // Recency: Days since last order
  const daysSince = lastPurchaseDate
    ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 3600 * 24))
    : 999;

  let score = 50;
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';

  if (orderCount === 0) {
    score = 100;
    riskLevel = 'high';
  } else {
    // Recency penalty: > 45 days is high risk, < 15 days is low risk
    const recencyScore = Math.min(60, Math.max(0, (daysSince / 60) * 60));
    // Frequency bonus: more orders reduce churn risk
    const freqDiscount = Math.min(25, orderCount * 5);
    // Monetary bonus: higher spend reduces churn risk
    const spendDiscount = Math.min(15, (totalSpent / 2000) * 15);

    score = Math.round(Math.max(5, Math.min(95, 40 + recencyScore - freqDiscount - spendDiscount)));

    if (score > 65) riskLevel = 'high';
    else if (score < 35) riskLevel = 'low';
    else riskLevel = 'medium';
  }

  const riskBadge =
    riskLevel === 'high' ? (
      <span className={`${styles.badge} ${styles.badgeRiskHigh}`}>High Risk ({score}%)</span>
    ) : riskLevel === 'medium' ? (
      <span className={`${styles.badge} ${styles.badgeRiskMedium}`}>Medium Risk ({score}%)</span>
    ) : (
      <span className={`${styles.badge} ${styles.badgeRiskLow}`}>Low Risk ({score}%)</span>
    );

  const riskColor =
    riskLevel === 'high'
      ? 'var(--color-danger)'
      : riskLevel === 'medium'
      ? 'var(--color-warning)'
      : 'var(--color-success)';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="var(--color-primary)" />
          <h3 className={styles.cardTitle}>Customer Retention & Churn</h3>
        </div>
        {riskBadge}
      </div>

      {/* Progress Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: 'var(--color-muted-text)' }}>
          <span>Churn Probability</span>
          <span style={{ fontWeight: 600, color: riskColor }}>{score}%</span>
        </div>
        <div style={{ width: '100%', height: 8, backgroundColor: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${score}%`,
              height: '100%',
              backgroundColor: riskColor,
              borderRadius: 4,
              transition: 'width 0.3s'
            }}
          />
        </div>
      </div>

      {/* RFM Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: 10,
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Recency</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {daysSince === 999 ? '—' : `${daysSince}d ago`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Frequency</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{orderCount} Orders</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Monetary</div>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="tabular-nums">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Predictive Module Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          fontSize: 12,
          color: 'var(--color-muted-text)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 10
        }}
      >
        <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Calculated via transactional RFM recency heuristics. Full predictive intelligence model will be active in Churn Insights module.
        </span>
      </div>
    </div>
  );
};
