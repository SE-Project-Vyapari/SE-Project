import React from 'react';
import { Button } from '../../../components/ui/Button';
import { useStore } from '../../../services/store';
import { CheckCircle2, FileText, Printer, Download, MessageSquare } from 'lucide-react';

interface SuccessScreenProps {
  data: {
    elapsedMs: number;
    total: number;
    customerId?: string;
    paymentMethod: string;
  };
  onReset: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ data, onReset }) => {
  const store = useStore();
  const customer = data.customerId ? store.customers.find(c => c.id === data.customerId) : null;
  const recentInvoice = store.invoices[store.invoices.length - 1]; // Assume last created

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)' }}>
      <div style={{ 
        width: 480, 
        backgroundColor: 'var(--color-surface)', 
        padding: 'var(--spacing-32)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <CheckCircle2 size={64} color="var(--color-success)" style={{ marginBottom: 24 }} />
        
        <h2 style={{ margin: '0 0 8px 0', fontSize: 24 }}>Sale Completed Successfully</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--color-muted-text)' }}>
          Processed in {(data.elapsedMs / 1000).toFixed(2)}s
        </p>

        <div style={{ 
          width: '100%', 
          padding: 16, 
          backgroundColor: 'var(--color-background)', 
          borderRadius: 'var(--radius-sm)',
          marginBottom: 24,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-muted-text)' }}>Invoice Number</span>
            <span style={{ fontWeight: 500 }}>{recentInvoice?.invoiceNumber || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-muted-text)' }}>Total Amount</span>
            <span style={{ fontWeight: 600, fontSize: 18 }}>₹{data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-muted-text)' }}>Payment Method</span>
            <span style={{ textTransform: 'capitalize' }}>{data.paymentMethod}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-muted-text)' }}>Customer</span>
            <span>{customer ? customer.name : 'Walk-in'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
          <Button style={{ flex: '1 1 45%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <FileText size={16} style={{ marginRight: 8 }} /> View Invoice
          </Button>
          <Button style={{ flex: '1 1 45%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <Printer size={16} style={{ marginRight: 8 }} /> Print
          </Button>
          <Button style={{ flex: '1 1 45%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <Download size={16} style={{ marginRight: 8 }} /> Download PDF
          </Button>
          <Button 
            onClick={() => alert('Sent via WhatsApp (simulated)')}
            style={{ flex: '1 1 45%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <MessageSquare size={16} style={{ marginRight: 8 }} /> Send to Customer
          </Button>
        </div>

        <Button onClick={onReset} style={{ width: '100%', backgroundColor: 'var(--color-primary)', color: 'white', padding: '12px 0', fontSize: 16 }}>
          New Sale
        </Button>
      </div>
    </div>
  );
};
