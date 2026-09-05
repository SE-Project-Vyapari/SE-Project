import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import { PredictionBadge } from '../../../../components/ui/PredictionBadge';
import styles from '../../styles/ai-assistant.module.css';
import { Users, ArrowRight } from 'lucide-react';

export const AtRiskCustomersAnswer: React.FC = () => {
  const navigate = useNavigate();
  const churnScores = useStore(state => state.churnScores);
  const customers = useStore(state => state.customers);
  const products = useStore(state => state.products);

  const { highRiskCount, totalRevAtRisk, atRiskList } = useMemo(() => {
    const highRisk = churnScores.filter(c => c.riskLevel === 'high');
    const revRisk = highRisk.reduce((sum, c) => sum + (c.revenueAtRisk || 0), 0);

    const detailedList = highRisk.map(c => {
      const cust = customers.find(cust => cust.id === c.customerId);
      const prod = products.find(p => p.id === c.productId);
      return {
        ...c,
        customerName: cust?.name || 'Customer ' + c.customerId,
        productName: prod?.name || 'Catalog Product',
        phone: cust?.phone || 'N/A'
      };
    });

    return {
      highRiskCount: highRisk.length,
      totalRevAtRisk: revRisk,
      atRiskList: detailedList.slice(0, 5)
    };
  }, [churnScores, customers, products]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Math.round(val)
    );

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} style={{ color: 'var(--color-danger)' }} />
          <span className={styles.answerIntentBadge}>Customer Churn Intelligence</span>
        </div>
        <PredictionBadge variant="ai" size="sm" />
      </div>

      <div className={styles.answerSummaryText}>
        {highRiskCount === 0 ? (
          <span>
            🎉 <strong>Healthy Customer Retention:</strong> No customer-product pairs currently exhibit high churn probability.
          </span>
        ) : (
          <span>
            ⚠️ <strong>{highRiskCount} customer accounts show high churn risk</strong>, representing an estimated{' '}
            <strong style={{ color: 'var(--color-danger)' }}>{formatINR(totalRevAtRisk)}</strong> in potential revenue at risk.
          </span>
        )}
      </div>

      {atRiskList.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.answerTable}>
            <thead>
              <tr>
                <th>Customer & Phone</th>
                <th>Product Relationship</th>
                <th className={styles.textRight}>Days Overdue</th>
                <th className={styles.textRight}>Risk Score</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {atRiskList.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{item.customerName}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{item.phone}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12 }}>{item.productName}</span>
                  </td>
                  <td className={`${styles.textRight} tabular-nums`} style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                    +{item.daysOverdue || 14} days
                  </td>
                  <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700, color: 'var(--color-danger)' }}>
                    {item.score}/100
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(198, 93, 58, 0.08)',
                        color: 'var(--color-primary)',
                        border: '1px solid rgba(198, 93, 58, 0.2)'
                      }}
                    >
                      {item.suggestedAction || 'Send WhatsApp 10% reorder promo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Transparent RFM cycle calculation: overdue days / average repurchase interval
        </span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={() => navigate('/insights?filter=high')}
        >
          Review Churn Prevention Hub <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
