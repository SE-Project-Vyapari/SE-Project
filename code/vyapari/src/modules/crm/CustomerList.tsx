import React, { useState, useEffect } from 'react';
import { useStore } from '../../services/store';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddCustomerModal } from './components/AddCustomerModal';
import { UserPlus, Search, ArrowRight } from 'lucide-react';
import styles from './styles/crm.module.css';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useStore();
  const { customers, orders, churnScores } = store;

  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loyaltyFilter, setLoyaltyFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Check if ?add=true is passed via URL (e.g. from Overview quick action)
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  // Helper to compute loyalty status for customer
  const getCustomerLoyalty = (customerId: string, totalSpent: number) => {
    const custOrders = orders.filter(o => o.customerId === customerId && o.status !== 'cancelled');
    const orderCount = custOrders.length;

    if (orderCount >= 5 || totalSpent >= 2500) return 'VIP';
    if (orderCount >= 2 || totalSpent >= 500) return 'Regular';
    return 'New';
  };

  // Helper to get churn risk for customer
  const getCustomerChurnRisk = (customerId: string) => {
    const scoreRecord = churnScores.find(c => c.customerId === customerId);
    if (!scoreRecord) return null;
    return scoreRecord.riskLevel;
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(customer => {
    // 1. Search by name or phone
    if (search) {
      const q = search.toLowerCase();
      const matchName = customer.name.toLowerCase().includes(q);
      const matchPhone = customer.phone ? customer.phone.toLowerCase().includes(q) : false;
      const matchEmail = customer.email ? customer.email.toLowerCase().includes(q) : false;
      if (!matchName && !matchPhone && !matchEmail) return false;
    }

    // 2. Type filter
    if (typeFilter !== 'all' && (customer.type || 'retail') !== typeFilter) {
      return false;
    }

    // 3. Loyalty filter
    const loyalty = getCustomerLoyalty(customer.id, customer.totalSpent);
    if (loyaltyFilter !== 'all' && loyalty !== loyaltyFilter) {
      return false;
    }

    // 4. Balance filter
    if (balanceFilter === 'outstanding' && (!customer.outstandingBalance || customer.outstandingBalance <= 0)) {
      return false;
    }

    return true;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Customers & Relationships</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-muted-text)', fontSize: 14 }}>
            Manage customer directories, track purchasing loyalty, and organize follow-up tasks.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 14
          }}
        >
          <UserPlus size={16} /> Add Customer
        </button>
      </div>

      {/* Filter Panel */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup} style={{ flex: '2 1 250px' }}>
          <label htmlFor="searchCust">Search Customer</label>
          <div style={{ position: 'relative' }}>
            <input
              id="searchCust"
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.inputField}
              style={{ paddingLeft: 34 }}
            />
            <Search
              size={16}
              color="var(--color-muted-text)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="typeFilter">Customer Type</label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Types</option>
            <option value="retail">Retail (B2C)</option>
            <option value="wholesale">Wholesale (B2B)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="loyaltyFilter">Loyalty Status</label>
          <select
            id="loyaltyFilter"
            value={loyaltyFilter}
            onChange={e => setLoyaltyFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Tiers</option>
            <option value="VIP">VIP</option>
            <option value="Regular">Regular</option>
            <option value="New">New</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="balanceFilter">Balance</label>
          <select
            id="balanceFilter"
            value={balanceFilter}
            onChange={e => setBalanceFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Balances</option>
            <option value="outstanding">Has Outstanding Balance</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <div className={styles.tableCard}>
        {filteredCustomers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted-text)' }}>
            No customers found matching your filter criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-surface)', textAlign: 'left' }}>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Customer Name</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Phone</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Type</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Total Spent</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Last Visit</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Loyalty</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Churn Risk</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => {
                const loyalty = getCustomerLoyalty(customer.id, customer.totalSpent);
                const churnRisk = getCustomerChurnRisk(customer.id);
                const outstanding = customer.outstandingBalance || 0;

                let loyaltyBadge = <span className={`${styles.badge} ${styles.badgeNew}`}>New</span>;
                if (loyalty === 'VIP') {
                  loyaltyBadge = <span className={`${styles.badge} ${styles.badgeVip}`}>VIP</span>;
                } else if (loyalty === 'Regular') {
                  loyaltyBadge = <span className={`${styles.badge} ${styles.badgeRegular}`}>Regular</span>;
                }

                let churnBadge = <span style={{ color: 'var(--color-muted-text)', fontSize: 13 }}>—</span>;
                if (churnRisk === 'high') {
                  churnBadge = <span className={`${styles.badge} ${styles.badgeRiskHigh}`}>High</span>;
                } else if (churnRisk === 'medium') {
                  churnBadge = <span className={`${styles.badge} ${styles.badgeRiskMedium}`}>Medium</span>;
                } else if (churnRisk === 'low') {
                  churnBadge = <span className={`${styles.badge} ${styles.badgeRiskLow}`}>Low</span>;
                }

                return (
                  <tr key={customer.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 16 }}>
                      <div
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        style={{ fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {customer.name}
                      </div>
                      {customer.email && (
                        <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 2 }}>{customer.email}</div>
                      )}
                    </td>

                    <td style={{ padding: 16, fontSize: 14 }}>
                      {customer.phone || <span style={{ color: 'var(--color-muted-text)' }}>—</span>}
                    </td>

                    <td style={{ padding: 16 }}>
                      <span className={`${styles.badge} ${customer.type === 'wholesale' ? styles.badgeWholesale : styles.badgeRetail}`}>
                        {customer.type === 'wholesale' ? 'Wholesale' : 'Retail'}
                      </span>
                    </td>

                    <td className="tabular-nums" style={{ padding: 16, fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
                      ₹{customer.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="tabular-nums" style={{ padding: 16, fontSize: 14, textAlign: 'right', fontWeight: outstanding > 0 ? 700 : 400, color: outstanding > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                      ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td style={{ padding: 16, fontSize: 14 }}>
                      {customer.lastVisit
                        ? new Date(customer.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span style={{ color: 'var(--color-muted-text)' }}>Never</span>}
                    </td>

                    <td style={{ padding: 16, textAlign: 'center' }}>
                      {loyaltyBadge}
                    </td>

                    <td style={{ padding: 16, textAlign: 'center' }}>
                      {churnBadge}
                    </td>

                    <td style={{ padding: 16, textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className={styles.actionButton}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        View Profile <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <AddCustomerModal
          onClose={() => setIsAddModalOpen(false)}
          onCustomerCreated={newCust => {
            navigate(`/customers/${newCust.id}`);
          }}
        />
      )}
    </div>
  );
};
