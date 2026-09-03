import { useStore } from '../../../services/store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CreditCard, Users } from 'lucide-react';
import { isInvoiceOverdue } from '../../../services/mockApi';

export const ActionCenter = () => {
  const store = useStore();
  const navigate = useNavigate();

  const actions = [];

  // Low Stock
  const lowStockCount = store.inventoryRecords.filter(i => i.quantity <= i.reorderLevel).length;
  if (lowStockCount > 0) {
    actions.push({
      id: 'low-stock',
      icon: AlertTriangle,
      color: 'var(--color-warning)',
      message: `${lowStockCount} items are low on stock or out of stock.`,
      cta: 'Reorder',
      route: '/inventory?filter=low'
    });
  }

  // Overdue Invoices
  const overdueCount = store.invoices.filter(i => i.status === 'overdue' || isInvoiceOverdue(i)).length;
  if (overdueCount > 0) {
    actions.push({
      id: 'overdue-invoices',
      icon: CreditCard,
      color: 'var(--color-danger)',
      message: `${overdueCount} overdue invoices require follow-up.`,
      cta: 'View Invoices',
      route: '/invoices?filter=overdue'
    });
  }

  // High Churn Risk (Wired to live Churn Intelligence scoring)
  const highChurnCount = store.churnScores?.filter(c => c.riskLevel === 'high').length || 0;
  if (highChurnCount > 0) {
    actions.push({
      id: 'high-churn',
      icon: Users,
      color: 'var(--color-danger)',
      message: `${highChurnCount} customer-product relationships show high churn risk.`,
      cta: 'Review',
      route: '/insights?filter=high'
    });
  }

  // Pending Payroll
  const pendingPayroll = store.payrollRuns?.filter(p => p.status === 'draft').length || 0;
  if (pendingPayroll > 0) {
    actions.push({
      id: 'pending-payroll',
      icon: AlertCircle,
      color: 'var(--color-warning)',
      message: `${pendingPayroll} payroll runs are pending approval.`,
      cta: 'Review Payroll',
      route: '/payroll?filter=pending'
    });
  }

  return (
    <Card style={{ padding: 'var(--spacing-24)', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Action Center</h3>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {actions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-text)' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>🎉</span>
            Nothing needs attention right now. Great job!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {actions.map(action => (
              <div key={action.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <action.icon color={action.color} size={20} />
                  <span style={{ fontSize: 14 }}>{action.message}</span>
                </div>
                <Button onClick={() => navigate(action.route)} style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  {action.cta}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
