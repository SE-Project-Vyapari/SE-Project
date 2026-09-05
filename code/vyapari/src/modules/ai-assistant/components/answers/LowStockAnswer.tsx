import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import styles from '../../styles/ai-assistant.module.css';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const LowStockAnswer: React.FC = () => {
  const navigate = useNavigate();
  const products = useStore(state => state.products);
  const inventoryRecords = useStore(state => state.inventoryRecords);

  const lowStockItems = useMemo(() => {
    // Find all inventory records at or below reorder level
    const depletedMap = new Map<string, { product: (typeof products)[0]; totalStock: number; reorderLevel: number }>();

    products.forEach(p => {
      const records = inventoryRecords.filter(r => r.productId === p.id);
      const stock = records.reduce((sum, r) => sum + r.quantity, 0);
      const reorder = records.length > 0 ? records[0].reorderLevel : 10;

      if (stock <= reorder) {
        depletedMap.set(p.id, { product: p, totalStock: stock, reorderLevel: reorder });
      }
    });

    return Array.from(depletedMap.values()).sort((a, b) => a.totalStock - b.totalStock);
  }, [products, inventoryRecords]);

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
          <span className={styles.answerIntentBadge}>Real-Time Inventory Alert</span>
        </div>
      </div>

      <div className={styles.answerSummaryText}>
        {lowStockItems.length === 0 ? (
          <span>
            🎉 <strong>All catalog products have healthy stock levels.</strong> No items are currently below their reorder threshold.
          </span>
        ) : (
          <span>
            ⚠️ <strong>{lowStockItems.length} {lowStockItems.length === 1 ? 'product is' : 'products are'} currently at or below reorder thresholds</strong> across your active outlet inventory.
          </span>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.answerTable}>
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th className={styles.textRight}>Available Stock</th>
                <th className={styles.textRight}>Reorder Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map(item => (
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
                  <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700, color: 'var(--color-danger)' }}>
                    {item.totalStock} units
                  </td>
                  <td className={`${styles.textRight} tabular-nums`}>{item.reorderLevel} units</td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#FBEAE8',
                        color: 'var(--color-danger)'
                      }}
                    >
                      {item.totalStock === 0 ? 'Out of Stock' : 'Low Stock'}
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
          Exact real-time count synced directly with Inventory management records
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => navigate('/forecasting')}
          >
            Review Demand Forecast
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => navigate('/inventory?filter=low')}
          >
            Manage Low Stock <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
