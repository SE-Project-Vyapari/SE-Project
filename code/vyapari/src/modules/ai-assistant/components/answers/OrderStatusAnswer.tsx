import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../../services/store';
import styles from '../../styles/ai-assistant.module.css';
import { Package, ArrowRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  orderId?: string;
}

export const OrderStatusAnswer: React.FC<Props> = ({ orderId }) => {
  const navigate = useNavigate();
  const orders = useStore(state => state.orders);
  const orderItems = useStore(state => state.orderItems);
  const products = useStore(state => state.products);
  const customers = useStore(state => state.customers);
  const outlets = useStore(state => state.outlets);

  const matchedOrder = useMemo(() => {
    if (!orderId) return null;
    const cleanId = orderId.trim().toLowerCase();
    return orders.find(
      o =>
        o.id.toLowerCase() === cleanId ||
        o.id.toLowerCase().replace(/[^\w-]/g, '') === cleanId.replace(/[^\w-]/g, '')
    );
  }, [orders, orderId]);

  const items = useMemo(() => {
    if (!matchedOrder) return [];
    return orderItems.filter(oi => oi.orderId === matchedOrder.id);
  }, [orderItems, matchedOrder]);

  const customer = useMemo(() => {
    if (!matchedOrder?.customerId) return null;
    return customers.find(c => c.id === matchedOrder.customerId);
  }, [customers, matchedOrder]);

  const outlet = useMemo(() => {
    if (!matchedOrder?.outletId) return null;
    return outlets.find(o => o.id === matchedOrder.outletId);
  }, [outlets, matchedOrder]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Math.round(val)
    );

  // If order was not found
  if (!matchedOrder) {
    const recentOrders = orders.slice(-4).reverse();

    return (
      <div className={styles.answerCard}>
        <div className={styles.answerCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} style={{ color: 'var(--color-warning)' }} />
            <span className={styles.answerIntentBadge}>Order Lookup</span>
          </div>
        </div>

        <div className={styles.answerSummaryText}>
          Order <strong>"{orderId || 'Unknown'}"</strong> could not be located in your database records.
        </div>

        <div style={{ padding: 14, background: 'rgba(0,0,0,0.02)', borderRadius: 6, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Recent active orders you can check:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recentOrders.map(o => (
              <span
                key={o.id}
                style={{
                  padding: '3px 8px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}
              >
                {o.id} ({formatINR(o.totalAmount)})
              </span>
            ))}
          </div>
        </div>

        <div className={styles.answerCardFooter}>
          <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            Please check the order number formatting (e.g. ord-90d-1-0)
          </span>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => navigate('/orders')}
          >
            Browse Order Ledger <ArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>Order Fulfillment Status</span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 12,
            background: matchedOrder.status === 'completed' ? '#EBF3EB' : '#FFF8E6',
            color: matchedOrder.status === 'completed' ? 'var(--color-success)' : '#B8863B'
          }}
        >
          {matchedOrder.status}
        </span>
      </div>

      <div className={styles.answerSummaryText}>
        Order <strong>#{matchedOrder.id}</strong> placed on{' '}
        <strong>{format(new Date(matchedOrder.createdAt), 'MMM dd, yyyy • hh:mm a')}</strong> is currently{' '}
        <strong style={{ color: 'var(--color-primary)' }}>{matchedOrder.status.toUpperCase()}</strong>.
      </div>

      {/* Meta Grid */}
      <div className={styles.metricMiniGrid}>
        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Customer</span>
          <span className={styles.metricMiniValue} style={{ fontSize: 14 }}>
            {customer?.name || 'Walk-in Customer'}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Fulfillment Outlet</span>
          <span className={styles.metricMiniValue} style={{ fontSize: 14 }}>
            {outlet?.name || 'Main Branch'}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Total Bill Amount</span>
          <span className={styles.metricMiniValue} style={{ color: 'var(--color-primary)' }}>
            {formatINR(matchedOrder.totalAmount)}
          </span>
        </div>

        <div className={styles.metricMiniCard}>
          <span className={styles.metricMiniLabel}>Item Count</span>
          <span className={styles.metricMiniValue}>{items.length} Line Items</span>
        </div>
      </div>

      {/* Order Line Items Table */}
      {items.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.answerTable}>
            <thead>
              <tr>
                <th>Item Description</th>
                <th className={styles.textRight}>Quantity</th>
                <th className={styles.textRight}>Unit Price</th>
                <th className={styles.textRight}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{prod?.name || item.productId}</span>
                    </td>
                    <td className={`${styles.textRight} tabular-nums`}>{item.quantity}</td>
                    <td className={`${styles.textRight} tabular-nums`}>{formatINR(item.unitPrice)}</td>
                    <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700 }}>
                      {formatINR(item.subtotal || item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Order Record ID: {matchedOrder.id}
        </span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={() => navigate(`/orders/${matchedOrder.id}`)}
        >
          View Full Order Detail <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
