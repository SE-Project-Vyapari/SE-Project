import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { PreferredProducts } from './components/PreferredProducts';
import { FollowUpsPanel } from './components/FollowUpsPanel';
import { ChurnInsightsCard } from './components/ChurnInsightsCard';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import styles from './styles/crm.module.css';

export const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const { customers, orders, invoices, payments, orderItems, products } = store;

  const customer = customers.find(c => c.id === id);

  if (!customer) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <h2>Customer Not Found</h2>
          <p style={{ color: 'var(--color-muted-text)' }}>The customer profile you requested could not be located.</p>
          <button
            onClick={() => navigate('/customers')}
            className={styles.actionButton}
            style={{ marginTop: 16 }}
          >
            ← Back to Customers
          </button>
        </div>
      </div>
    );
  }

  // Get customer initials
  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Find all orders for this customer (excluding cancelled for metrics)
  const customerOrders = orders.filter(o => o.customerId === customer.id);
  const activeOrders = customerOrders.filter(o => o.status !== 'cancelled');
  const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);

  // Compute live overview metrics
  const totalOrders = activeOrders.length;
  const totalSpent = customer.totalSpent || activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const lifetimeValue = totalSpent;
  const aov = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Find last purchase date
  const sortedOrders = [...activeOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const lastPurchaseDate = sortedOrders[0]?.createdAt || customer.lastVisit;

  // Helper to describe items in an invoice
  const getInvoiceItemSummary = (orderId: string) => {
    const items = orderItems.filter(i => i.orderId === orderId);
    if (items.length === 0) return '—';
    const names = items
      .map(i => {
        const prod = products.find(p => p.id === i.productId);
        return `${prod?.name || 'Product'} (${i.quantity})`;
      })
      .slice(0, 2)
      .join(', ');
    return items.length > 2 ? `${names} +${items.length - 2} more` : names;
  };

  // Helper to find payment method for an invoice
  const getInvoicePaymentMethod = (invoiceId: string) => {
    const payment = payments.find(p => p.invoiceId === invoiceId);
    return payment ? payment.method : 'Cash';
  };

  return (
    <div className={styles.container}>
      {/* Top Bar Back Link */}
      <div>
        <button
          onClick={() => navigate('/customers')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ArrowLeft size={18} /> Back to Customers
        </button>
      </div>

      {/* Customer Header Card */}
      <div className={styles.profileHeaderCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className={styles.customerAvatar}>{initials}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>{customer.name}</h1>
              <span className={`${styles.badge} ${customer.type === 'wholesale' ? styles.badgeWholesale : styles.badgeRetail}`}>
                {customer.type === 'wholesale' ? 'Wholesale (B2B)' : 'Retail (B2C)'}
              </span>
              {customer.optInForMessages !== false ? (
                <span className={`${styles.badge} ${styles.badgeOptIn}`}>Opted-In (Messages)</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeOptOut}`}>Opted-Out (Messages)</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8, color: 'var(--color-muted-text)', fontSize: 13, flexWrap: 'wrap' }}>
              {customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} /> {customer.phone}
                </div>
              )}
              {customer.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} /> {customer.email}
                </div>
              )}
              {customer.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} /> {customer.address}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/pos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <ShoppingCart size={16} /> New Sale
          </button>
        </div>
      </div>

      {/* Metrics Overview Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Lifetime Value (LTV)</div>
          <div className={`${styles.statValue} tabular-nums`} style={{ color: 'var(--color-primary)' }}>
            ₹{lifetimeValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{totalOrders}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Average Order Value (AOV)</div>
          <div className={`${styles.statValue} tabular-nums`}>
            ₹{aov.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Outstanding Balance</div>
          <div
            className={`${styles.statValue} tabular-nums`}
            style={{ color: (customer.outstandingBalance || 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
          >
            ₹{(customer.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Last Purchase</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-dark)', marginTop: 4 }}>
            {lastPurchaseDate
              ? new Date(lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'No orders yet'}
          </div>
        </div>
      </div>

      {/* Two-Column Responsive Layout */}
      <div className={styles.profileContentGrid}>
        {/* Left Column: Preferred Products + Churn Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
          <PreferredProducts customerId={customer.id} />
          <ChurnInsightsCard
            orderCount={totalOrders}
            totalSpent={totalSpent}
            lastPurchaseDate={lastPurchaseDate}
          />
        </div>

        {/* Right Column: Follow-ups + Purchase History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
          <FollowUpsPanel customer={customer} />

          {/* Purchase & Invoice History */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} color="var(--color-primary)" />
                <h3 className={styles.cardTitle}>Purchase & Invoice History</h3>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                {customerInvoices.length} Invoices
              </span>
            </div>

            {customerInvoices.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-muted-text)', fontSize: 14 }}>
                No purchase transactions recorded.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600 }}>Invoice #</th>
                      <th style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600 }}>Items</th>
                      <th style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600 }}>Method</th>
                      <th style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.map(inv => {
                      let statusBadge = (
                        <span className={`${styles.badge} ${styles.badgePaid}`}>Paid</span>
                      );
                      if (inv.status === 'partially_paid') {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgePartiallyPaid}`}>Partial</span>
                        );
                      } else if (inv.status === 'unpaid') {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>
                        );
                      } else if (inv.status === 'cancelled') {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgeCancelled}`}>Void</span>
                        );
                      }

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '12px 8px', fontSize: 13 }}>
                            {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </td>

                          <td style={{ padding: '12px 8px', fontSize: 13, fontWeight: 500 }}>
                            <span
                              onClick={() => navigate(`/invoices/${inv.id}`)}
                              style={{
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {inv.invoiceNumber}
                            </span>
                          </td>

                          <td style={{ padding: '12px 8px', fontSize: 12, color: 'var(--color-muted-text)', maxWidth: 160 }}>
                            {getInvoiceItemSummary(inv.orderId)}
                          </td>

                          <td
                            className="tabular-nums"
                            style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, textAlign: 'right' }}
                          >
                            ₹{inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td style={{ padding: '12px 8px', fontSize: 12, textTransform: 'capitalize' }}>
                            {getInvoicePaymentMethod(inv.id)}
                          </td>

                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
