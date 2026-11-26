import type * as Types from '../types';
import { isInvoiceOverdue } from './mockApi';

export type StockStatusLabel =
  | 'Out of Stock'
  | 'Critical'
  | 'Low Stock'
  | 'Overstock'
  | 'Healthy';

export function getStockStatus(quantity: number, reorderLevel: number): StockStatusLabel {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= reorderLevel * 0.25) return 'Critical';
  if (quantity <= reorderLevel) return 'Low Stock';
  if (reorderLevel > 0 && quantity >= reorderLevel * 3) return 'Overstock';
  return 'Healthy';
}

export function getLowStockRecords(records: Types.InventoryRecord[]): Types.InventoryRecord[] {
  return records.filter(r => r.quantity <= r.reorderLevel);
}

export function getOutstandingTotal(invoices: Types.Invoice[]): number {
  return invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + Math.max(0, i.amount - (i.amountPaid || 0)), 0);
}

export function getOverdueInvoices(invoices: Types.Invoice[]): Types.Invoice[] {
  return invoices.filter(i => i.status === 'overdue' || isInvoiceOverdue(i));
}

export function getHighChurnScores(churnScores: Types.ChurnScore[]): Types.ChurnScore[] {
  return churnScores.filter(c => c.riskLevel === 'high');
}

export function getPendingPayrollRuns(payrollRuns: Types.PayrollRun[]): Types.PayrollRun[] {
  return payrollRuns.filter(p => p.status === 'draft' || p.status === 'calculated');
}
