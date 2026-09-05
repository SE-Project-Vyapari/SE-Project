import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import { PredictionBadge } from '../../../../components/ui/PredictionBadge';
import styles from '../../styles/ai-assistant.module.css';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { isToday, isAfter, subDays } from 'date-fns';

export const TodaySalesAnswer: React.FC = () => {
  const navigate = useNavigate();
  const sales = useStore(state => state.sales);
  const orderItems = useStore(state => state.orderItems);
  const products = useStore(state => state.products);

  const { todayRevenue, todayOrders, todayAOV, topProduct } = useMemo(() => {
    // Check sales created today (or in the most recent 24h of data)
    let recentSales = sales.filter(s => isToday(new Date(s.createdAt)));
    if (recentSales.length === 0) {
      // Fallback to last 2 days of demo records
      const cutoff = subDays(new Date(), 2);
      recentSales = sales.filter(s => isAfter(new Date(s.createdAt), cutoff));
    }

    const rev = recentSales.reduce((sum, s) => sum + s.total, 0);
    const ordCount = recentSales.length;
    const aov = ordCount > 0 ? Math.round(rev / ordCount) : 0;

    // Determine top product
    const prodCountMap = new Map<string, number>();
    recentSales.forEach(s => {
      const items = orderItems.filter(oi => oi.orderId === s.orderId);
      items.forEach(item => {
        prodCountMap.set(item.productId, (prodCountMap.get(item.productId) || 0) + item.quantity);
      });
    });

    let topProdName = 'N/A';
    let topQty = 0;
    prodCountMap.forEach((qty, pid) => {
      if (qty > topQty) {
        topQty = qty;
        const prod = products.find(p => p.id === pid);
        if (prod) topProdName = prod.name;
      }
    });

    return {
      todayRevenue: rev,
      todayOrders: ordCount,
      todayAOV: aov,
      topProduct: { name: topProdName, quantity: topQty },
      recentSalesList: recentSales.slice(0, 5)
    };
  }, [sales, orderItems, products]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Math.round(val)
    );

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>Sales Intelligence Summary</span>
        </div>
        <PredictionBadge variant="prediction" size="sm" />
      </div>

      <div className={styles.answerSummaryText}>
        Today's total sales volume stands at <strong>{formatINR(todayRevenue)}</strong> across{' '}
        <strong>{todayOrders} completed orders</strong>, with an average ticket value of{' '}
        <strong>{formatINR(todayAOV)}</strong>.
      </div>

      {/* Mini KPI Grid */}
      <div className={styles.metricMiniGrid}>
        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Gross Revenue</span>
          <span className={styles.metricMiniValue} style={{ color: 'var(--color-primary)' }}>
            {formatINR(todayRevenue)}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Order Volume</span>
          <span className={styles.metricMiniValue}>{todayOrders} Orders</span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Average Ticket (AOV)</span>
          <span className={styles.metricMiniValue}>{formatINR(todayAOV)}</span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Top Selling SKU</span>
          <span className={styles.metricMiniValue} style={{ fontSize: 14 }}>
            {topProduct.name} ({topProduct.quantity} sold)
          </span>
        </div>
      </div>

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Real-time aggregation from active POS checkout register
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => navigate('/pos')}
          >
            Open POS Register
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => navigate('/analytics?tab=sales')}
          >
            Deep Sales Analytics <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
