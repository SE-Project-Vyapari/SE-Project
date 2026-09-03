import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../services/store';
import { Activity, Sparkles, ArrowRight } from 'lucide-react';
import styles from '../styles/crm.module.css';

interface ChurnInsightsCardProps {
  customerId?: string;
  orderCount: number;
  totalSpent: number;
  lastPurchaseDate?: string;
}

export const ChurnInsightsCard: React.FC<ChurnInsightsCardProps> = ({
  customerId,
  orderCount,
  totalSpent,
  lastPurchaseDate
}) => {
  const navigate = useNavigate();
  const store = useStore();
  const { churnScores, products } = store;

  // Check if real churn intelligence scores exist for this customer
  const customerScores = customerId
    ? churnScores.filter(s => s.customerId === customerId)
    : [];

  // Sort by highest risk score
  const sortedScores = [...customerScores].sort((a, b) => b.score - a.score);
  const primaryScore = sortedScores[0];

  // If real customer-product churn scores exist, use them
  const daysSince = lastPurchaseDate
    ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 3600 * 24))
    : 999;

  let score = primaryScore ? primaryScore.score : 50;
  let riskLevel: 'low' | 'medium' | 'high' = primaryScore ? primaryScore.riskLevel : 'medium';

  if (!primaryScore) {
    if (orderCount === 0) {
      score = 100;
      riskLevel = 'high';
    } else {
      const recencyScore = Math.min(60, Math.max(0, (daysSince / 60) * 60));
      const freqDiscount = Math.min(25, orderCount * 5);
      const spendDiscount = Math.min(15, (totalSpent / 2000) * 15);
      score = Math.round(Math.max(5, Math.min(95, 40 + recencyScore - freqDiscount - spendDiscount)));
      if (score >= 70) riskLevel = 'high';
      else if (score < 35) riskLevel = 'low';
      else riskLevel = 'medium';
    }
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

  const primaryProduct = primaryScore
    ? products.find(p => p.id === primaryScore.productId)
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="var(--color-primary)" />
          <h3 className={styles.cardTitle}>Customer Retention & Churn</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {riskBadge}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              padding: '2px 6px',
              backgroundColor: 'rgba(198, 93, 58, 0.1)',
              color: 'var(--color-primary)',
              borderRadius: 4,
              border: '1px solid rgba(198, 93, 58, 0.2)'
            }}
          >
            Prediction
          </span>
        </div>
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
            {primaryScore?.daysSinceLastPurchase !== undefined
              ? `${primaryScore.daysSinceLastPurchase}d ago`
              : daysSince === 999 ? '—' : `${daysSince}d ago`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
            {primaryScore?.averageIntervalDays ? 'Normal Cycle' : 'Frequency'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {primaryScore?.averageIntervalDays ? `~${primaryScore.averageIntervalDays}d` : `${orderCount} Orders`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
            {primaryScore?.daysOverdue ? 'Days Overdue' : 'Monetary'}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: primaryScore?.daysOverdue ? 'var(--color-danger)' : 'inherit'
            }}
            className="tabular-nums"
          >
            {primaryScore?.daysOverdue
              ? `+${primaryScore.daysOverdue}d`
              : `₹${totalSpent.toLocaleString('en-IN')}`}
          </div>
        </div>
      </div>

      {/* Primary Product At-Risk Detail if available */}
      {primaryScore && primaryProduct && (
        <div style={{ fontSize: 12, padding: '8px 10px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ color: 'var(--color-muted-text)', fontSize: 11 }}>Highest Risk Product Relationship:</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{primaryProduct.name}</div>
          {primaryScore.factors && primaryScore.factors.length > 0 && (
            <div style={{ color: 'var(--color-muted-text)', marginTop: 4, fontStyle: 'italic' }}>
              • {primaryScore.factors[0]}
            </div>
          )}
        </div>
      )}

      {/* Action to View in Customer Insights */}
      <button
        onClick={() => navigate(`/insights?filter=${riskLevel}`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-primary)',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} /> View in Customer Insights Dashboard
        </span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
};
