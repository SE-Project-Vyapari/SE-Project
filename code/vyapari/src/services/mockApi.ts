import { store } from './store';
import { eventBus, Events } from './eventBus';
import * as Types from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export const mockApi = {
  // ---------------------------------------------------------
  // Basic CRUD Examples
  // ---------------------------------------------------------
  async listProducts(): Promise<Types.Product[]> {
    await delay(200);
    return store.getState().products;
  },

  async getInventory(outletId: string): Promise<Types.InventoryRecord[]> {
    await delay(150);
    return store.getState().inventoryRecords.filter(r => r.outletId === outletId);
  },

  // ---------------------------------------------------------
  // Complex Business Logic
  // ---------------------------------------------------------

  /**
   * recordSale
   * 1. Creates Sale + Order + OrderItems
   * 2. Decrements InventoryRecord
   * 3. Creates Invoice
   * 4. Creates LedgerEntry
   * 5. Stamps AuditEvents
   */
  async recordSale(payload: {
    businessId: string;
    outletId: string;
    cashierId: string;
    customerId?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }) {
    await delay(350);

    const state = store.getState();
    const now = new Date().toISOString();
    let totalAmount = 0;

    // Pre-flight check for inventory
    for (const item of payload.items) {
      const inv = state.inventoryRecords.find(
        r => r.productId === item.productId && r.outletId === payload.outletId
      );
      if (!inv || inv.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
      totalAmount += item.quantity * item.unitPrice;
    }

    // 1. Create Order
    const order: Types.Order = {
      id: generateId(),
      outletId: payload.outletId,
      customerId: payload.customerId,
      cashierId: payload.cashierId,
      status: 'completed',
      totalAmount,
      createdAt: now
    };
    store.insert('orders', order);

    // 1b. Create Order Items & Decrement Inventory
    payload.items.forEach(item => {
      const orderItem: Types.OrderItem = {
        id: generateId(),
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      };
      store.insert('orderItems', orderItem);

      // Decrement Inventory
      const inv = state.inventoryRecords.find(
        r => r.productId === item.productId && r.outletId === payload.outletId
      )!;
      const newQuantity = inv.quantity - item.quantity;
      store.update('inventoryRecords', inv.id, {
        quantity: newQuantity,
        lastUpdated: now
      });

      // Fire threshold event if needed
      if (newQuantity <= inv.reorderLevel) {
        eventBus.publish(Events.STOCK_BELOW_THRESHOLD, { productId: item.productId, outletId: payload.outletId, remaining: newQuantity });
      }
    });

    // 2. Create Sale
    const sale: Types.Sale = {
      id: generateId(),
      orderId: order.id,
      outletId: payload.outletId,
      customerId: payload.customerId,
      total: totalAmount,
      createdAt: now
    };
    store.insert('sales', sale);
    
    // 3. Create Invoice
    const invoice: Types.Invoice = {
      id: generateId(),
      orderId: order.id,
      invoiceNumber: `INV-${Date.now()}`,
      customerId: payload.customerId,
      amount: totalAmount,
      status: 'paid', // Assuming POS cash sale
      createdAt: now
    };
    store.insert('invoices', invoice);

    // 4. Create LedgerEntry
    const ledgerEntry: Types.LedgerEntry = {
      id: generateId(),
      businessId: payload.businessId,
      amount: totalAmount,
      type: 'credit',
      sourceType: 'sale',
      referenceId: sale.id,
      createdAt: now
    };
    store.insert('ledgerEntries', ledgerEntry);

    // 5. Audit Events
    const auditEvent: Types.AuditEvent = {
      id: generateId(),
      businessId: payload.businessId,
      action: 'SALE_COMPLETED',
      entityType: 'Sale',
      entityId: sale.id,
      actorId: payload.cashierId,
      details: JSON.stringify({ saleCreatedAt: now, invoiceGeneratedAt: now }),
      timestamp: now
    };
    store.insert('auditEvents', auditEvent);

    eventBus.publish(Events.SALE_COMPLETED, { saleId: sale.id });
    
    return { sale, invoice, order };
  },

  /**
   * computeChurnScore
   * Uses simple RFM scoring.
   */
  async computeChurnScore(customerId: string, productId: string): Promise<Types.ChurnScore> {
    await delay(200);
    const state = store.getState();
    const stat = state.customerProductStats.find(s => s.customerId === customerId && s.productId === productId);
    
    let score = 50;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    if (stat) {
      const daysSincePurchase = (Date.now() - new Date(stat.lastPurchased).getTime()) / (1000 * 3600 * 24);
      // Simple mock logic
      score = Math.min(100, Math.max(0, (daysSincePurchase / 30) * 100));
      if (score > 75) riskLevel = 'high';
      else if (score < 30) riskLevel = 'low';
    } else {
      score = 100;
      riskLevel = 'high';
    }

    const churnRecord: Types.ChurnScore = {
      id: generateId(),
      customerId,
      score,
      riskLevel,
      calculatedAt: new Date().toISOString()
    };
    store.insert('churnScores', churnRecord);
    return churnRecord;
  },

  /**
   * computeForecast
   * Simple moving average simulation
   */
  async computeForecast(productId: string): Promise<Types.ForecastEntry[]> {
    await delay(300);
    // Real implementation would read from Sales/OrderItems. We mock an output here.
    return [
      {
        id: generateId(),
        productId,
        outletId: 'default',
        predictedDate: new Date(Date.now() + 86400000).toISOString(),
        predictedDemand: 45,
        confidenceScore: 0.85
      }
    ];
  },

  /**
   * runPayroll
   */
  async runPayroll(businessId: string, month: string) {
    await delay(400);
    const state = store.getState();
    const employees = state.employees.filter(e => e.businessId === businessId && e.status === 'active');
    
    let totalPayroll = 0;
    const runId = generateId();
    
    employees.forEach(emp => {
      // Mock computation based on Attendance
      const attendance = state.attendanceRecords.filter(a => a.employeeId === emp.id && a.date.startsWith(month));
      const hours = attendance.reduce((sum, record) => sum + record.hoursWorked, 0);
      const gross = hours * emp.hourlyRate;
      const deductions = gross * 0.1; // 10% flat tax mock
      const net = gross - deductions;

      store.insert('payrollLineItems', {
        id: generateId(),
        payrollRunId: runId,
        employeeId: emp.id,
        hoursWorked: hours,
        amount: gross,
        deductions,
        netPay: net
      });
      
      totalPayroll += net;
    });

    const run: Types.PayrollRun = {
      id: runId,
      businessId,
      month,
      totalAmount: totalPayroll,
      status: 'processed',
      createdAt: new Date().toISOString()
    };
    store.insert('payrollRuns', run);
    eventBus.publish(Events.PAYROLL_PROCESSED, { payrollRunId: runId });
    return run;
  }
};
