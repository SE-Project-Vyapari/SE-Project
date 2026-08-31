import React from 'react';
import { useStore } from '../../../services/store';
import { Package, TrendingUp } from 'lucide-react';
import styles from '../styles/crm.module.css';

interface PreferredProductsProps {
  customerId: string;
}

export const PreferredProducts: React.FC<PreferredProductsProps> = ({ customerId }) => {
  const store = useStore();
  const { orders, orderItems, products } = store;

  // Find all orders for this customer (excluding cancelled)
  const customerOrders = orders.filter(
    o => o.customerId === customerId && o.status !== 'cancelled'
  );
  const customerOrderIds = new Set(customerOrders.map(o => o.id));

  // Find order items in these orders
  const items = orderItems.filter(item => customerOrderIds.has(item.orderId));

  // Aggregate by productId
  const productStatsMap: {
    [productId: string]: {
      quantity: number;
      totalSpent: number;
      orderCount: number;
      lastDate: string;
    };
  } = {};

  items.forEach(item => {
    const parentOrder = customerOrders.find(o => o.id === item.orderId);
    const orderDate = parentOrder ? parentOrder.createdAt : '';

    if (!productStatsMap[item.productId]) {
      productStatsMap[item.productId] = {
        quantity: 0,
        totalSpent: 0,
        orderCount: 0,
        lastDate: orderDate
      };
    }

    productStatsMap[item.productId].quantity += item.quantity;
    productStatsMap[item.productId].totalSpent += item.subtotal;
    productStatsMap[item.productId].orderCount += 1;

    if (
      orderDate &&
      (!productStatsMap[item.productId].lastDate ||
        new Date(orderDate) > new Date(productStatsMap[item.productId].lastDate))
    ) {
      productStatsMap[item.productId].lastDate = orderDate;
    }
  });

  // Convert to array and sort by total spent / frequency descending
  const sortedProducts = Object.entries(productStatsMap)
    .map(([productId, stat]) => {
      const product = products.find(p => p.id === productId);
      return {
        productId,
        name: product ? product.name : 'Unknown Product',
        category: product ? product.category : 'General',
        ...stat
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5); // Top 5

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color="var(--color-primary)" />
          <h3 className={styles.cardTitle}>Preferred Products</h3>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>Top {sortedProducts.length} items</span>
      </div>

      {sortedProducts.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-muted-text)', fontSize: 14 }}>
          No purchase history recorded yet.
        </div>
      ) : (
        <div>
          {sortedProducts.map((p, idx) => (
            <div key={p.productId} className={styles.productItem}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <span className={styles.rankNumber}>#{idx + 1}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Package size={16} color="var(--color-muted-text)" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>
                      {p.category} • {p.quantity} units ({p.orderCount} orders)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }} className="tabular-nums">
                  ₹{p.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {p.lastDate && (
                  <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>
                    Last: {new Date(p.lastDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
