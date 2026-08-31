import React, { useState } from 'react';
import { useStore } from '../../services/store';
import { isInvoiceOverdue } from '../../services/mockApi';
import { useNavigate } from 'react-router-dom';
import styles from './styles/invoices.module.css';

export const InvoicesList: React.FC = () => {
  const navigate = useNavigate();
  const store = useStore();
  const { invoices, customers, outlets, orderItems } = store;

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [outletFilter, setOutletFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to compute GST total for an invoice (derived from orderItems)
  const getInvoiceGSTAmount = (orderId: string) => {
    // Find order items
    const items = orderItems.filter(item => item.orderId === orderId);
    let totalGST = 0;
    
    items.forEach(item => {
      // Find product to get category
      const product = store.products.find(p => p.id === item.productId);
      const category = product?.category?.toLowerCase() || '';
      // Grocery: 5% inclusive, Electronics: 18% inclusive, general: 12% inclusive
      const gstRate = category.includes('grocery') ? 5 : category.includes('electronics') ? 18 : 12;
      
      // Since product price in our system is inclusive, we back-calculate:
      // TaxableValue = subtotal / (1 + gstRate/100)
      // GST Amount = subtotal - TaxableValue
      const taxableValue = item.subtotal / (1 + gstRate / 100);
      const gstAmount = item.subtotal - taxableValue;
      totalGST += gstAmount;
    });

    return totalGST;
  };

  // Helper to get customer name
  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Walk-in Customer';
    const c = customers.find(item => item.id === customerId);
    return c ? c.name : 'Unknown Customer';
  };

  // Helper to get outlet name for an invoice
  const getOutletNameForInvoice = (orderId: string) => {
    const order = store.orders.find(o => o.id === orderId);
    if (!order) return 'Unknown Outlet';
    const outlet = outlets.find(o => o.id === order.outletId);
    return outlet ? outlet.name : 'Unknown Outlet';
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    // 1. Search by invoice number
    if (search && !invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // 2. Status filter (with derived Overdue state)
    const isOverdue = isInvoiceOverdue(invoice);
    const calculatedStatus = isOverdue ? 'overdue' : invoice.status;

    if (statusFilter !== 'all' && calculatedStatus !== statusFilter) {
      return false;
    }

    // 3. Customer filter
    if (customerFilter !== 'all' && invoice.customerId !== customerFilter) {
      return false;
    }

    // 4. Outlet filter
    if (outletFilter !== 'all') {
      const order = store.orders.find(o => o.id === invoice.orderId);
      if (!order || order.outletId !== outletFilter) return false;
    }

    // 5. Date filters
    const invoiceDate = new Date(invoice.createdAt);
    if (startDate && invoiceDate < new Date(startDate)) {
      return false;
    }
    // Add 23:59:59 to end date to make filter inclusive of the end day
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      if (invoiceDate > endDateTime) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Invoices</h1>
      </div>

      {/* Filter Panel */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup}>
          <label htmlFor="search">Search Invoice #</label>
          <input
            id="search"
            type="text"
            placeholder="Search invoice number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.inputField}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Pending / Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled / Voided</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="customer">Customer</label>
          <select
            id="customer"
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="outlet">Outlet</label>
          <select
            id="outlet"
            value={outletFilter}
            onChange={e => setOutletFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Outlets</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="startDate">From Date</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={styles.inputField}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="endDate">To Date</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={styles.inputField}
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className={styles.tableCard}>
        {filteredInvoices.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-text)' }}>
            No invoices found matching criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-surface)', textAlign: 'left' }}>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Invoice #</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Date</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Outlet</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>Customer</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>GST</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Due Date</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: 16, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => {
                const isOverdue = isInvoiceOverdue(invoice);
                const gstAmount = getInvoiceGSTAmount(invoice.orderId);
                
                let badgeClass = styles.badgePending;
                let statusLabel = 'Pending';
                
                if (invoice.status === 'paid') {
                  badgeClass = styles.badgePaid;
                  statusLabel = 'Paid';
                } else if (invoice.status === 'partially_paid') {
                  badgeClass = styles.badgePartiallyPaid;
                  statusLabel = 'Partial';
                } else if (invoice.status === 'cancelled') {
                  badgeClass = styles.badgeCancelled;
                  statusLabel = 'Cancelled';
                } else if (isOverdue) {
                  badgeClass = styles.badgeOverdue;
                  statusLabel = 'Overdue';
                }

                return (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 16, fontWeight: 500 }}>
                      <span 
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {invoice.invoiceNumber}
                      </span>
                    </td>
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {getOutletNameForInvoice(invoice.orderId)}
                    </td>
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {getCustomerName(invoice.customerId)}
                    </td>
                    <td className="tabular-nums" style={{ padding: 16, fontSize: 14, textAlign: 'right' }}>
                      ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="tabular-nums" style={{ padding: 16, fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
                      ₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, textAlign: 'center' }}>
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td style={{ padding: 16, textAlign: 'center' }}>
                      <span className={`${styles.badge} ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: 16, textAlign: 'right' }}>
                      <button 
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className={styles.actionButton}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
