import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import { PredictionBadge } from '../../../../components/ui/PredictionBadge';
import styles from '../../styles/ai-assistant.module.css';
import { PackageCheck, ArrowRight } from 'lucide-react';

export const ReorderSuggestionsAnswer: React.FC = () => {
  const navigate = useNavigate();
  const products = useStore(state => state.products);
  const orderItems = useStore(state => state.orderItems);
  const inventoryRecords = useStore(state => state.inventoryRecords);

  const reorderList = useMemo(() => {
    // Stock map
    const stockMap = new Map<string, number>();
    inventoryRecords.forEach(r => {
      stockMap.set(r.productId, (stockMap.get(r.productId) || 0) + r.quantity);
    });

    // Calculate 14-day velocity
    const dailyMap = new Map<string, number>();
    orderItems.forEach(item => {
      dailyMap.set(item.productId, (dailyMap.get(item.productId) || 0) + item.quantity);
    });

    return products
      .map(p => {
        const totalSold = dailyMap.get(p.id) || 0;
        const avgDaily = totalSold / 30;
        const forecast14d = Math.round(avgDaily * 14);
        const stock = stockMap.get(p.id) || 0;
        const safety = Math.max(5, Math.ceil(forecast14d * 0.2));
        const reorderQty = Math.max(0, forecast14d - stock + safety);

        return {
          product: p,
          stock,
          forecast14d,
          reorderQty,
          confidence: totalSold >= 20 ? 'High' : totalSold >= 8 ? 'Medium' : 'Low'
        };
      })
      .filter(item => item.reorderQty > 0)
      .sort((a, b) => b.reorderQty - a.reorderQty);
  }, [products, orderItems, inventoryRecords]);

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PackageCheck size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>Algorithmic Reorder Suggestions</span>
        </div>
        <PredictionBadge variant="recommendation" size="sm" />
      </div>

      <div className={styles.answerSummaryText}>
        Based on 14-day rolling demand moving averages and 20% safety buffers,{' '}
        <strong>{reorderList.length} {reorderList.length === 1 ? 'product requires' : 'products require'} inventory replenishment</strong>.
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.answerTable}>
          <thead>
            <tr>
              <th>Product & SKU</th>
              <th>Category</th>
              <th className={styles.textRight}>Current Stock</th>
              <th className={styles.textRight}>14-Day Demand</th>
              <th className={styles.textRight}>Recommended Reorder</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {reorderList.slice(0, 5).map(item => (
              <tr key={item.product.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{item.product.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{item.product.sku}</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 12 }}>{item.product.category}</span>
                </td>
                <td className={`${styles.textRight} tabular-nums`}>{item.stock} units</td>
                <td className={`${styles.textRight} tabular-nums`}>{item.forecast14d} units</td>
                <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  +{item.reorderQty} units
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: item.confidence === 'High' ? '#EBF3EB' : '#FFF8E6',
                      color: item.confidence === 'High' ? 'var(--color-success)' : '#B8863B'
                    }}
                  >
                    {item.confidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Mathematical formula: max(0, 14d_Forecast - Stock + Safety_Buffer)
        </span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={() => navigate('/forecasting')}
        >
          Review Full Forecast Matrix <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
