import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { mockApi, isInvoiceOverdue } from '../../services/mockApi';
import { ArrowLeft, Printer, Download, Send, CreditCard, X } from 'lucide-react';
import styles from './styles/invoices.module.css';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const { invoices, customers, outlets, orderItems, products, orders } = store;

  const invoice = invoices.find(inv => inv.id === id);

  // Mark Paid Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!invoice) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h3>Invoice Not Found</h3>
          <button onClick={() => navigate('/invoices')} className={styles.actionButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const order = orders.find(ord => ord.id === invoice.orderId);
  const customer = invoice.customerId ? customers.find(c => c.id === invoice.customerId) : null;
  const outlet = order ? outlets.find(o => o.id === order.outletId) : null;

  // Retrieve line items
  const items = order ? orderItems.filter(item => item.orderId === order.id) : [];

  // Derive overdue status
  const isOverdue = isInvoiceOverdue(invoice);

  // Business metadata
  const businessName = store.businesses[0]?.name || 'Vyapari Retailers';
  const gstin = store.businesses[0]?.taxId || '29AAAAA1111A1Z5'; // Sample GSTIN
  const outletAddress = outlet?.address || '123 Main Street, Sector 4, Bengaluru, Karnataka';

  // Compute Indian GST factors
  const computedItems = items.map((item, index) => {
    const product = products.find(p => p.id === item.productId);
    const description = product ? product.name : 'Unknown Product';
    const category = product?.category?.toLowerCase() || '';

    // Derive GST Rate % and HSN Code based on category
    let gstRate = 12; // default
    let hsnCode = '990000'; // default service/misc HSN
    
    if (category.includes('grocery') || category.includes('food')) {
      gstRate = 5;
      hsnCode = '1905';
    } else if (category.includes('electronics') || category.includes('device')) {
      gstRate = 18;
      hsnCode = '8471';
    } else if (category.includes('apparel') || category.includes('clothing')) {
      gstRate = 5;
      hsnCode = '6109';
    } else if (category.includes('stationery')) {
      gstRate = 12;
      hsnCode = '4820';
    }

    // Back-calculate taxable value from GST-inclusive subtotal:
    // Subtotal = TaxableValue + GSTAmount
    // TaxableValue = Subtotal / (1 + Rate/100)
    // CGST = SGST = GSTAmount / 2
    const inclusiveSubtotal = item.subtotal;
    const taxableSubtotal = inclusiveSubtotal / (1 + gstRate / 100);
    const gstAmount = inclusiveSubtotal - taxableSubtotal;
    const cgstAmount = gstAmount / 2;
    const sgstAmount = gstAmount / 2;

    const taxExclusiveUnitPrice = taxableSubtotal / item.quantity;

    return {
      serial: index + 1,
      description,
      hsnCode,
      quantity: item.quantity,
      unitPriceTaxExclusive: taxExclusiveUnitPrice,
      taxableValue: taxableSubtotal,
      gstRate,
      cgstRate: gstRate / 2,
      cgstAmount,
      sgstRate: gstRate / 2,
      sgstAmount,
      total: inclusiveSubtotal
    };
  });

  // Aggregated totals
  const subtotalExclusive = computedItems.reduce((sum, item) => sum + item.taxableValue, 0);
  const grandTotal = invoice.amount;
  const amountPaid = invoice.amountPaid || 0;
  const balanceDue = grandTotal - amountPaid;

  // Group GST for rate breakdown
  const gstGroups: { [key: number]: { cgst: number; sgst: number; taxable: number } } = {};
  computedItems.forEach(item => {
    if (!gstGroups[item.gstRate]) {
      gstGroups[item.gstRate] = { cgst: 0, sgst: 0, taxable: 0 };
    }
    gstGroups[item.gstRate].cgst += item.cgstAmount;
    gstGroups[item.gstRate].sgst += item.sgstAmount;
    gstGroups[item.gstRate].taxable += item.taxableValue;
  });

  // Action: Print
  const handlePrint = () => {
    window.print();
  };

  // Action: Download (Simulated PDF download via print)
  const handleDownload = () => {
    alert('Opening print window. To download as PDF, please choose "Save as PDF" as your print destination.');
    window.print();
  };

  // Action: Send WhatsApp mock
  const handleSend = () => {
    if (!customer) {
      alert('Walk-in Customer has no linked account or phone. Send action is disabled.');
      return;
    }
    if (!customer.phone) {
      alert('Customer has no phone number listed. Send action is disabled.');
      return;
    }
    alert(`Invoice ${invoice.invoiceNumber} has been successfully sent to ${customer.name} via WhatsApp on phone: ${customer.phone} (Simulated).`);
  };

  // Action: Mark Paid submission
  const handleOpenMarkPaid = () => {
    setPaymentAmount(parseFloat(balanceDue.toFixed(2)));
    setIsModalOpen(true);
  };

  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (paymentAmount > parseFloat(balanceDue.toFixed(2))) {
      alert('Payment amount cannot exceed the remaining balance due.');
      return;
    }

    setIsSubmitting(true);
    try {
      await mockApi.markInvoicePaid(invoice.id, paymentAmount, paymentMethod);
      setIsModalOpen(false);
      alert('Payment recorded successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.detailContainer}>
      {/* Navigation and quick action row */}
      <div className={styles.backBar}>
        <button 
          onClick={() => navigate('/invoices')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 16, fontWeight: 500 }}
        >
          <ArrowLeft size={20} /> Back to Invoices
        </button>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            <Printer size={16} /> Print
          </button>
          
          <button 
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            <Download size={16} /> PDF
          </button>

          <button 
            onClick={handleSend}
            disabled={!customer || !customer.phone}
            title={!customer ? 'Walk-in customer' : !customer.phone ? 'No phone number' : 'Send WhatsApp'}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '8px 16px', 
              backgroundColor: 'var(--color-surface)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 'var(--radius-sm)', 
              cursor: (!customer || !customer.phone) ? 'not-allowed' : 'pointer',
              opacity: (!customer || !customer.phone) ? 0.5 : 1
            }}
          >
            <Send size={16} /> Send
          </button>

          {balanceDue > 0 && invoice.status !== 'cancelled' && (
            <button 
              onClick={handleOpenMarkPaid}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            >
              <CreditCard size={16} /> Mark Paid
            </button>
          )}
        </div>
      </div>

      {/* Invoice Sheet Design */}
      <div className={styles.invoicePaper}>
        {/* Status Stamp Watermark */}
        {invoice.status === 'paid' && (
          <div className={`${styles.watermarkStamp} ${styles.stampPaid}`}>Paid</div>
        )}
        {invoice.status === 'cancelled' && (
          <div className={`${styles.watermarkStamp} ${styles.stampCancelled}`}>Void</div>
        )}
        {invoice.status === 'partially_paid' && (
          <div className={`${styles.watermarkStamp} ${styles.stampPartiallyPaid}`}>Partial</div>
        )}
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && isOverdue && (
          <div className={`${styles.watermarkStamp} ${styles.stampOverdue}`}>Overdue</div>
        )}

        {/* Invoice Header */}
        <div className={styles.invoiceHeader}>
          <div className={styles.businessInfo}>
            <h2>{businessName}</h2>
            <p style={{ fontWeight: 600 }}>Outlet: {outlet?.name || 'Main Outlet'}</p>
            <p>{outletAddress}</p>
            <p style={{ marginTop: 6 }}><span style={{ fontWeight: 600 }}>GSTIN:</span> {gstin}</p>
          </div>
          <div className={styles.invoiceMeta}>
            <h1>TAX INVOICE</h1>
            <p><span style={{ fontWeight: 600 }}>Invoice #:</span> {invoice.invoiceNumber}</p>
            <p><span style={{ fontWeight: 600 }}>Date:</span> {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p><span style={{ fontWeight: 600 }}>Due Date:</span> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
          </div>
        </div>

        {/* Billing Information */}
        <div className={styles.billingSection}>
          <div className={styles.billTo}>
            <h3>Bill To</h3>
            {customer ? (
              <>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{customer.name}</p>
                {customer.phone && <p>Phone: {customer.phone}</p>}
                {customer.email && <p>Email: {customer.email}</p>}
                <p>Address: Bengaluru, Karnataka, India</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, fontSize: 16 }}>Walk-in Customer</p>
                <p style={{ color: '#718096', fontSize: 13, fontStyle: 'italic' }}>No customer details registered</p>
              </>
            )}
          </div>
          <div className={styles.paymentDetails}>
            <h3>Invoice Summary</h3>
            <p><span style={{ fontWeight: 600 }}>Total Amount:</span> ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p><span style={{ fontWeight: 600 }}>Amount Paid:</span> ₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p style={{ fontWeight: 700, color: balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              <span>Balance Due:</span> ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>#</th>
              <th style={{ width: '35%' }}>Product / Description</th>
              <th style={{ width: '10%', textAlign: 'center' }}>HSN</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Price (Excl.)</th>
              <th style={{ width: '10%', textAlign: 'center' }}>GST Rate</th>
              <th style={{ width: '10%', textAlign: 'right' }}>CGST</th>
              <th style={{ width: '10%', textAlign: 'right' }}>SGST</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Total (Incl.)</th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map(item => (
              <tr key={item.serial}>
                <td style={{ textAlign: 'center', color: '#718096' }}>{item.serial}</td>
                <td style={{ fontWeight: 500 }}>{item.description}</td>
                <td style={{ textAlign: 'center', color: '#718096', fontSize: 13 }}>{item.hsnCode}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  ₹{item.unitPriceTaxExclusive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'center', color: '#718096', fontSize: 13 }}>
                  {item.gstRate}%
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  ₹{item.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <div style={{ fontSize: 10, color: '#A0AEC0' }}>({item.cgstRate}%)</div>
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  ₹{item.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <div style={{ fontSize: 10, color: '#A0AEC0' }}>({item.sgstRate}%)</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
                  ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className={styles.summarySection}>
          <div className={styles.summaryBlock}>
            <div className={styles.summaryRow}>
              <span>Subtotal (Tax Exclusive)</span>
              <span className="tabular-nums">₹{subtotalExclusive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {/* GST Rate Breakdown */}
            {Object.keys(gstGroups).map(rateStr => {
              const rate = parseFloat(rateStr);
              const group = gstGroups[rate];
              return (
                <React.Fragment key={rate}>
                  <div className={styles.summaryRow} style={{ fontSize: 13, color: '#718096' }}>
                    <span>CGST ({rate / 2}%) on ₹{group.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="tabular-nums">₹{group.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={styles.summaryRow} style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>
                    <span>SGST ({rate / 2}%) on ₹{group.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="tabular-nums">₹{group.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </React.Fragment>
              );
            })}

            <div className={styles.summaryRowTotal}>
              <span>Grand Total</span>
              <span className="tabular-nums">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className={styles.summaryRow} style={{ marginTop: 10, fontSize: 13 }}>
              <span>Total Paid</span>
              <span className="tabular-nums">₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className={styles.summaryRow} style={{ fontWeight: 600, fontSize: 14 }}>
              <span>Balance Due</span>
              <span className="tabular-nums" style={{ color: balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Footer Details */}
        <div className={styles.notesSection}>
          <h4>Terms & Notes</h4>
          <p>1. All payments should be made to Aarav General Store directly.</p>
          <p>2. Subject to local judicial jurisdiction only.</p>
          <p>3. This is a computer-generated tax invoice and requires no physical signature.</p>
        </div>
      </div>

      {/* Mark Paid Modal Dialog */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Record Invoice Payment</h3>
              <button onClick={() => setIsModalOpen(false)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleMarkPaidSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Remaining Balance</label>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="payAmt">Payment Amount (₹)</label>
                <input
                  id="payAmt"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balanceDue}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="payMethod">Payment Method</label>
                <select
                  id="payMethod"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className={styles.selectField}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className={styles.modalFooter}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Recording...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
