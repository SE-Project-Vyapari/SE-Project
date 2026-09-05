import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssistantIntentType } from '../../services/queryRouter';
import styles from '../../styles/ai-assistant.module.css';
import { HelpCircle, ArrowRight, Info } from 'lucide-react';

interface FaqAnswerProps {
  intent: AssistantIntentType;
}

interface FaqContent {
  title: string;
  badge: string;
  summary: string;
  steps: { title: string; desc: string }[];
  actionLabel: string;
  actionRoute: string;
  tip?: string;
}

const FAQ_MAP: Record<string, FaqContent> = {
  faq_add_product: {
    title: 'How to Add a New Product to Inventory',
    badge: 'Inventory Guide',
    summary: 'Follow these steps to register a new SKU, set pricing, reorder points, and initial stock quantities:',
    steps: [
      {
        title: 'Open Inventory Module',
        desc: 'Navigate to the Inventory section from the main sidebar navigation.'
      },
      {
        title: 'Click "+ Add Product"',
        desc: 'Click the primary action button located at the top right of the inventory table.'
      },
      {
        title: 'Fill Product Specifications',
        desc: 'Enter the Product Name, SKU / Barcode, Category, HSN Code, Cost Price, and Selling Price.'
      },
      {
        title: 'Configure Stock Alerts',
        desc: 'Specify the initial stock quantity and set the Reorder Threshold to trigger automated low-stock warnings.'
      },
      {
        title: 'Save & Synchronize',
        desc: 'Click "Save Product". The new SKU will immediately be available at the POS register and in Demand Forecasting.'
      }
    ],
    actionLabel: 'Go to Inventory',
    actionRoute: '/inventory',
    tip: 'Ensure the HSN code is accurate for automatic GST tax tier calculations on customer receipts.'
  },
  faq_return_refund: {
    title: 'How to Process Customer Returns and Refunds',
    badge: 'POS & Orders Guide',
    summary: 'Here is the step-by-step workflow for processing returns, restocking items, and issuing refunds:',
    steps: [
      {
        title: 'Locate the Original Order',
        desc: 'Navigate to Orders / Sales History or scan the original receipt barcode in the POS terminal.'
      },
      {
        title: 'Select Return / Exchange',
        desc: 'Click on the order details and choose the "Process Return / Refund" action.'
      },
      {
        title: 'Choose Items & Reason',
        desc: 'Select the returned items, quantity, condition (Defective / Customer Exchange), and restocking preference.'
      },
      {
        title: 'Issue Refund or Store Credit',
        desc: 'Select the refund payment method (Cash, Original Card/UPI, or Customer Credit Balance) and confirm.'
      },
      {
        title: 'Automatic Ledger Posting',
        desc: 'The system updates inventory stock count and logs a debit adjustment in the financial ledger.'
      }
    ],
    actionLabel: 'Go to Orders',
    actionRoute: '/orders',
    tip: 'Damaged or defective goods marked as "non-restockable" will be logged into wastage analytics.'
  },
  faq_payroll: {
    title: 'How to Run Monthly Payroll',
    badge: 'Payroll Guide',
    summary: 'Execute salary calculations, attendance adjustments, and employee disbursements with ease:',
    steps: [
      {
        title: 'Navigate to Payroll Module',
        desc: 'Open "Payroll" from the sidebar under Employee Management.'
      },
      {
        title: 'Start a New Payroll Run',
        desc: 'Select the target month and year, then click "Start Payroll Run" to create a draft batch.'
      },
      {
        title: 'Calculate from Attendance',
        desc: 'Click "Calculate". The system computes Base + Allowances - Deductions - Unpaid Leave automatically.'
      },
      {
        title: 'Review & Approve',
        desc: 'Verify the line items for each employee. Once confirmed, approve the payroll run.'
      },
      {
        title: 'Mark as Paid & Post to Ledger',
        desc: 'Click "Mark Paid" to disburse salaries. Expense entries and ledger vouchers are created automatically.'
      }
    ],
    actionLabel: 'Go to Payroll',
    actionRoute: '/payroll',
    tip: 'Ensure all employee attendance records and leave approvals for the month are up to date before calculating.'
  },
  faq_stock_transfer: {
    title: 'How to Transfer Stock Between Outlets',
    badge: 'Multi-Outlet Guide',
    summary: 'Manage inter-branch inventory transfers while maintaining unified audit logs:',
    steps: [
      {
        title: 'Open Stock Transfers',
        desc: 'From the Inventory module, switch to the "Transfers" tab or select "New Transfer".'
      },
      {
        title: 'Select Source & Destination',
        desc: 'Choose the dispatching warehouse/outlet and the receiving destination outlet.'
      },
      {
        title: 'Add Items & Quantities',
        desc: 'Select SKUs and quantities to transfer. The system validates available stock at the source location.'
      },
      {
        title: 'Dispatch Transfer',
        desc: 'Submit the transfer order. Source inventory is deducted and marked as "In Transit".'
      },
      {
        title: 'Receive & Acknowledge',
        desc: 'Upon physical delivery, the destination outlet manager clicks "Acknowledge Receipt" to update stock.'
      }
    ],
    actionLabel: 'Go to Inventory',
    actionRoute: '/inventory',
    tip: 'In-transit items are tracked separately so stock counts remain reconciled during transit.'
  },
  faq_gst_invoice: {
    title: 'How to Generate and Print GST Invoices',
    badge: 'Billing & Compliance',
    summary: 'Create compliant GST tax invoices with itemized CGST, SGST, IGST, and QR verification:',
    steps: [
      {
        title: 'Complete a Sale or Open Invoices',
        desc: 'From the POS terminal or the Invoices module, create a new B2B or B2C bill.'
      },
      {
        title: 'Attach Customer GSTIN (Optional)',
        desc: 'For B2B transactions, link the registered customer to automatically pull their GSTIN and state code.'
      },
      {
        title: 'Verify Tax Slab Breakdown',
        desc: 'The invoice automatically computes CGST + SGST (intra-state) or IGST (inter-state) per HSN slab.'
      },
      {
        title: 'Print or Share Digital Invoice',
        desc: 'Click "Print Tax Invoice" (thermal or A4 format) or click "Share via WhatsApp / Email".'
      }
    ],
    actionLabel: 'Go to Invoices',
    actionRoute: '/invoices',
    tip: 'Vyapari stores compliant GST invoice numbers with sequential financial year numbering.'
  }
};

export const FaqAnswer: React.FC<FaqAnswerProps> = ({ intent }) => {
  const navigate = useNavigate();
  const faq = FAQ_MAP[intent] || FAQ_MAP.faq_add_product;

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HelpCircle size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>{faq.badge}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)', fontWeight: 600 }}>Standard Operating Procedure</span>
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-dark)' }}>
          {faq.title}
        </h3>
        <div className={styles.answerSummaryText}>{faq.summary}</div>
      </div>

      {/* Step List */}
      <div className={styles.faqStepList}>
        {faq.steps.map((step, idx) => (
          <div key={idx} className={styles.faqStepItem}>
            <div className={styles.faqStepNumber}>{idx + 1}</div>
            <div className={styles.faqStepContent}>
              <span className={styles.faqStepTitle}>{step.title}</span>
              <span className={styles.faqStepDesc}>{step.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {faq.tip && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            fontSize: 13,
            color: '#1e40af'
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Pro-tip:</strong> {faq.tip}
          </span>
        </div>
      )}

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Vyapari Business Operating Workflow Guide
        </span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={() => navigate(faq.actionRoute)}
        >
          {faq.actionLabel} <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
