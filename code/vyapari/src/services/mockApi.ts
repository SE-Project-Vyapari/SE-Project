import { store } from './store';
import { eventBus, Events } from './eventBus';
import * as Types from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export const isInvoiceOverdue = (invoice: { status: string; dueDate?: string }) => {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
};

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
      history: [{ status: 'completed', timestamp: now }],
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
      createdAt: now,
      amountPaid: totalAmount
    };
    store.insert('invoices', invoice);

    // Update customer total spent
    if (payload.customerId) {
      const customer = state.customers.find(c => c.id === payload.customerId);
      if (customer) {
        store.update('customers', payload.customerId, {
          totalSpent: (customer.totalSpent || 0) + totalAmount,
          lastVisit: now
        });
      }
    }

    // 4. Create LedgerEntry
    const ledgerEntry: Types.LedgerEntry = {
      id: generateId(),
      businessId: payload.businessId,
      outletId: payload.outletId,
      amount: totalAmount,
      type: 'credit',
      sourceType: 'sale',
      referenceId: sale.id,
      description: `POS Sale #${sale.id.substring(0, 8)}`,
      category: 'Sales',
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
   * Uses transparent RFM repurchase-interval scoring per customer-product pair.
   */
  async computeChurnScore(customerId: string, productId: string): Promise<Types.ChurnScore> {
    await delay(100);
    const state = store.getState();
    const customer = state.customers.find(c => c.id === customerId);
    const inventory = state.inventoryRecords.find(i => i.productId === productId);

    // Find all valid non-cancelled customer orders
    const customerOrders = state.orders.filter(o => o.customerId === customerId && o.status !== 'cancelled');
    const customerOrderIds = new Set(customerOrders.map(o => o.id));

    // Find all purchase records of this product
    const relevantItems = state.orderItems.filter(i => i.productId === productId && customerOrderIds.has(i.orderId));

    const purchases = relevantItems.map(item => {
      const parentOrder = customerOrders.find(o => o.id === item.orderId);
      return {
        orderId: item.orderId,
        date: new Date(parentOrder?.createdAt || Date.now()),
        quantity: item.quantity,
        subtotal: item.subtotal
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const isOutOfStock = inventory ? inventory.quantity <= 0 : false;
    const isLowStock = inventory ? inventory.quantity <= inventory.reorderLevel : false;
    const now = Date.now();

    let score = 50;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    let status: 'active' | 'insufficient_history' = 'active';
    let daysSinceLastPurchase = 0;
    let averageIntervalDays = 0;
    let daysOverdue = 0;
    let revenueAtRisk = 0;
    const factors: string[] = [];
    let suggestedAction = 'Send reorder reminder';

    if (purchases.length === 0) {
      status = 'insufficient_history';
      score = 90;
      riskLevel = 'high';
      daysSinceLastPurchase = 999;
      averageIntervalDays = 0;
      daysOverdue = 0;
      factors.push('Customer has never purchased this product before.');
      factors.push('At risk from day one — initial product discovery needed.');
      suggestedAction = 'Introduce product with promotional offer';
    } else if (purchases.length === 1) {
      status = 'insufficient_history';
      const singlePurchase = purchases[0];
      daysSinceLastPurchase = Math.floor((now - singlePurchase.date.getTime()) / (1000 * 3600 * 24));
      averageIntervalDays = 0;
      daysOverdue = 0;
      revenueAtRisk = singlePurchase.subtotal;

      factors.push(`Only 1 historical purchase recorded on ${singlePurchase.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`);
      factors.push(`${daysSinceLastPurchase} days have elapsed since initial purchase.`);
      if (daysSinceLastPurchase > 30) {
        score = Math.min(95, 65 + Math.floor(daysSinceLastPurchase / 10));
        riskLevel = 'high';
        factors.push('First-time buyer with no return purchase (At risk from day one).');
        suggestedAction = customer?.type === 'wholesale'
          ? 'Call to gather first-order feedback & discuss restocking'
          : 'Send first-order satisfaction follow-up & repeat discount';
      } else {
        score = 40;
        riskLevel = 'medium';
        factors.push('Recent new buyer — awaiting standard repeat cycle.');
        suggestedAction = 'Follow up for product satisfaction & usage feedback';
      }
    } else {
      // k >= 2 purchases: calculate repurchase intervals
      const intervals: number[] = [];
      for (let i = 1; i < purchases.length; i++) {
        const diffDays = Math.max(1, Math.round((purchases[i].date.getTime() - purchases[i - 1].date.getTime()) / (1000 * 3600 * 24)));
        intervals.push(diffDays);
      }

      averageIntervalDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      const lastPurchase = purchases[purchases.length - 1];
      daysSinceLastPurchase = Math.floor((now - lastPurchase.date.getTime()) / (1000 * 3600 * 24));
      daysOverdue = Math.max(0, daysSinceLastPurchase - averageIntervalDays);
      const overdueRatio = daysSinceLastPurchase / Math.max(1, averageIntervalDays);

      // Frequency trend analysis across cycles
      let intervalChangePercent = 0;
      if (intervals.length >= 2) {
        const recentInterval = intervals[intervals.length - 1];
        const previousAvg = intervals.slice(0, -1).reduce((a, b) => a + b, 0) / (intervals.length - 1);
        intervalChangePercent = Math.round(((recentInterval - previousAvg) / previousAvg) * 100);
      }

      // Base RFM risk score derivation
      if (overdueRatio <= 1.0) {
        // Customer is repurchasing on track or faster than normal
        score = Math.round(Math.max(5, Math.min(34, overdueRatio * 34)));
        riskLevel = 'low';
      } else if (overdueRatio <= 1.75) {
        // Moderately past typical window
        score = Math.round(35 + ((overdueRatio - 1.0) / 0.75) * 35);
        riskLevel = 'medium';
      } else {
        // Significantly overdue
        score = Math.round(Math.min(98, 71 + ((overdueRatio - 1.75) / 1.25) * 27));
        riskLevel = 'high';
      }

      // Trend adjustment
      if (intervalChangePercent > 20) {
        score = Math.min(98, score + 5);
      } else if (intervalChangePercent < -20 && riskLevel !== 'high') {
        score = Math.max(5, score - 5);
      }

      if (score >= 70) riskLevel = 'high';
      else if (score >= 35) riskLevel = 'medium';
      else riskLevel = 'low';

      // Revenue at risk calculation
      const avgSpendPerOrder = purchases.reduce((sum, p) => sum + p.subtotal, 0) / purchases.length;
      if (riskLevel === 'high') {
        revenueAtRisk = Math.round(avgSpendPerOrder * 2);
      } else if (riskLevel === 'medium') {
        revenueAtRisk = Math.round(avgSpendPerOrder);
      } else {
        revenueAtRisk = 0;
      }

      // Build plain-language "Why?" factors
      factors.push(`${daysSinceLastPurchase} days since last purchase on ${lastPurchase.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}.`);
      factors.push(`Previously purchased every ~${averageIntervalDays} days on average across ${purchases.length} cycles.`);
      if (daysOverdue > 0) {
        factors.push(`Currently ${daysOverdue} days past the typical ${averageIntervalDays}-day repurchase window.`);
      } else {
        factors.push(`Purchasing on schedule (within expected ${averageIntervalDays}-day cycle).`);
      }

      if (intervalChangePercent > 20) {
        factors.push(`Repurchase frequency declined by ${intervalChangePercent}% between recent cycles.`);
      } else if (intervalChangePercent < -15) {
        factors.push(`Purchase frequency trending positively (accelerated by ${Math.abs(intervalChangePercent)}%).`);
      }

      // Suggested action derivation
      if (isOutOfStock) {
        suggestedAction = 'Restock product in inventory and alert customer';
      } else if (riskLevel === 'high') {
        suggestedAction = customer?.type === 'wholesale'
          ? 'Schedule check-in call & offer bulk restock discount'
          : 'Send reorder reminder with personalized discount';
      } else if (riskLevel === 'medium') {
        suggestedAction = 'Send automated reorder reminder';
      } else {
        suggestedAction = 'Maintain regular engagement & relationship';
      }
    }

    if (isOutOfStock) {
      factors.push('⚠️ Product is currently OUT OF STOCK in inventory (Quantity: 0).');
    } else if (isLowStock) {
      factors.push(`⚠️ Product is low on stock (${inventory?.quantity} remaining, reorder level ${inventory?.reorderLevel}).`);
    }

    // Preserve existing reviewed status if present
    const existing = state.churnScores.find(s => s.customerId === customerId && s.productId === productId);
    const churnRecord: Types.ChurnScore = {
      id: existing?.id || generateId(),
      customerId,
      productId,
      score,
      riskLevel,
      status,
      daysSinceLastPurchase,
      averageIntervalDays,
      daysOverdue,
      revenueAtRisk,
      factors,
      suggestedAction,
      reviewed: existing?.reviewed || false,
      calculatedAt: new Date().toISOString()
    };

    if (existing) {
      store.update('churnScores', existing.id, churnRecord);
    } else {
      store.insert('churnScores', churnRecord);
    }

    eventBus.publish(Events.CHURN_RISK_CHANGED, { customerId, productId, score, riskLevel });
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
      const rate = emp.hourlyRate || (emp.salary ? Math.round(emp.salary / (30 * 8)) : 100);
      const gross = hours * rate;
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
  },

  /**
   * addProduct
   */
  async addProduct(payload: { businessId: string; name: string; sku: string; barcode?: string; category: string; price: number; cost: number; initialStock: number; reorderLevel: number; outletId: string }) {
    await delay(300);
    const now = new Date().toISOString();
    
    const product: Types.Product = {
      id: generateId(),
      businessId: payload.businessId,
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode,
      category: payload.category,
      price: payload.price,
      cost: payload.cost,
      createdAt: now
    };
    store.insert('products', product);

    const inventory: Types.InventoryRecord = {
      id: generateId(),
      productId: product.id,
      outletId: payload.outletId,
      quantity: payload.initialStock,
      reorderLevel: payload.reorderLevel,
      lastUpdated: now
    };
    store.insert('inventoryRecords', inventory);

    if (payload.initialStock > 0) {
      store.insert('stockMovements', {
        id: generateId(),
        productId: product.id,
        outletId: payload.outletId,
        quantityChange: payload.initialStock,
        type: 'in',
        createdAt: now
      });
    }
    
    return { product, inventory };
  },

  /**
   * adjustStock
   */
  async adjustStock(payload: { productId: string; outletId: string; change: number; reason: 'in' | 'out' | 'adjustment'; referenceId?: string }) {
    await delay(300);
    const state = store.getState();
    const inv = state.inventoryRecords.find(r => r.productId === payload.productId && r.outletId === payload.outletId);
    if (!inv) throw new Error('Inventory record not found');

    const newQuantity = inv.quantity + payload.change;
    const now = new Date().toISOString();

    store.update('inventoryRecords', inv.id, { quantity: newQuantity, lastUpdated: now });

    const movement: Types.StockMovement = {
      id: generateId(),
      productId: payload.productId,
      outletId: payload.outletId,
      quantityChange: payload.change,
      type: payload.reason,
      referenceId: payload.referenceId,
      createdAt: now
    };
    store.insert('stockMovements', movement);

    if (newQuantity <= inv.reorderLevel) {
      eventBus.publish(Events.STOCK_BELOW_THRESHOLD, { productId: payload.productId, outletId: payload.outletId, remaining: newQuantity });
    }
    return { inventory: { ...inv, quantity: newQuantity }, movement };
  },

  /**
   * initiateTransfer
   */
  async initiateTransfer(payload: { productId: string; fromOutletId: string; toOutletId: string; quantity: number }) {
    await delay(300);
    const state = store.getState();
    const sourceInv = state.inventoryRecords.find(r => r.productId === payload.productId && r.outletId === payload.fromOutletId);
    
    if (!sourceInv || sourceInv.quantity < payload.quantity) {
      throw new Error('Insufficient stock for transfer');
    }

    const now = new Date().toISOString();

    // Decrement source
    const newQuantity = sourceInv.quantity - payload.quantity;
    store.update('inventoryRecords', sourceInv.id, { quantity: newQuantity, lastUpdated: now });
    
    const movementOut: Types.StockMovement = {
      id: generateId(),
      productId: payload.productId,
      outletId: payload.fromOutletId,
      quantityChange: -payload.quantity,
      type: 'transfer',
      createdAt: now
    };
    store.insert('stockMovements', movementOut);

    const transfer: Types.StockTransfer = {
      id: generateId(),
      productId: payload.productId,
      fromOutletId: payload.fromOutletId,
      toOutletId: payload.toOutletId,
      quantity: payload.quantity,
      status: 'pending',
      createdAt: now
    };
    store.insert('stockTransfers', transfer);
    
    return transfer;
  },

  /**
   * receiveTransfer
   */
  async receiveTransfer(transferId: string) {
    await delay(300);
    const state = store.getState();
    const transfer = state.stockTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') throw new Error('Invalid transfer');

    const now = new Date().toISOString();

    // Find or create destination inventory record
    let destInv = state.inventoryRecords.find(r => r.productId === transfer.productId && r.outletId === transfer.toOutletId);
    if (destInv) {
      store.update('inventoryRecords', destInv.id, { quantity: destInv.quantity + transfer.quantity, lastUpdated: now });
    } else {
      const newInv: Types.InventoryRecord = {
        id: generateId(),
        productId: transfer.productId,
        outletId: transfer.toOutletId,
        quantity: transfer.quantity,
        reorderLevel: 5,
        lastUpdated: now
      };
      store.insert('inventoryRecords', newInv);
    }

    const movementIn: Types.StockMovement = {
      id: generateId(),
      productId: transfer.productId,
      outletId: transfer.toOutletId,
      quantityChange: transfer.quantity,
      type: 'transfer',
      referenceId: transfer.id,
      createdAt: now
    };
    store.insert('stockMovements', movementIn);
    
    store.update('stockTransfers', transfer.id, { status: 'completed', completedAt: now });
    return transfer;
  },

  /**
   * createOrder (Manual Entry)
   */
  async createOrder(payload: {
    outletId: string;
    cashierId: string;
    customerId?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    notes?: string;
  }) {
    await delay(300);
    const now = new Date().toISOString();
    let totalAmount = 0;

    const orderId = generateId();

    payload.items.forEach(item => {
      const subtotal = item.quantity * item.unitPrice;
      totalAmount += subtotal;
      store.insert('orderItems', {
        id: generateId(),
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal
      });
    });

    const order: Types.Order = {
      id: orderId,
      outletId: payload.outletId,
      customerId: payload.customerId,
      cashierId: payload.cashierId,
      status: 'pending',
      totalAmount,
      history: [{ status: 'pending', timestamp: now }],
      createdAt: now
    };
    store.insert('orders', order);

    // Generate unpaid invoice immediately for manual order
    const invoice: Types.Invoice = {
      id: generateId(),
      orderId,
      invoiceNumber: `INV-${Date.now()}`,
      customerId: payload.customerId,
      amount: totalAmount,
      status: 'unpaid',
      dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
      createdAt: now,
      amountPaid: 0
    };
    store.insert('invoices', invoice);

    // Update customer outstanding balance
    if (payload.customerId) {
      const customer = store.getState().customers.find(c => c.id === payload.customerId);
      if (customer) {
        store.update('customers', payload.customerId, {
          outstandingBalance: (customer.outstandingBalance || 0) + totalAmount
        });
      }
    }
    
    return order;
  },

  /**
   * updateOrderStatus
   */
  async updateOrderStatus(orderId: string, newStatus: Types.Order['status']) {
    await delay(200);
    const state = store.getState();
    const order = state.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const now = new Date().toISOString();
    const history = [...(order.history || []), { status: newStatus, timestamp: now }];

    // If reversing a completed/processing order that decremented stock, we restock
    if ((newStatus === 'cancelled' && ['processing', 'ready', 'completed'].includes(order.status)) || newStatus === 'returned') {
      const items = state.orderItems.filter(i => i.orderId === orderId);
      for (const item of items) {
        const inv = state.inventoryRecords.find(r => r.productId === item.productId && r.outletId === order.outletId);
        if (inv) {
          store.update('inventoryRecords', inv.id, { quantity: inv.quantity + item.quantity, lastUpdated: now });
          store.insert('stockMovements', {
            id: generateId(),
            productId: item.productId,
            outletId: order.outletId,
            quantityChange: item.quantity,
            type: newStatus === 'returned' ? 'in' : 'adjustment',
            referenceId: orderId,
            createdAt: now
          });
        }
      }
    }

    // Cancel or Void invoice if order is cancelled or returned
    if (newStatus === 'cancelled' || newStatus === 'returned') {
      const invoice = state.invoices.find(i => i.orderId === orderId);
      if (invoice && invoice.status !== 'cancelled') {
        store.update('invoices', invoice.id, { status: 'cancelled' });
        // Deduct from customer outstanding balance if it was unpaid
        if (order.customerId) {
          const customer = state.customers.find(c => c.id === order.customerId);
          if (customer) {
            const unpaidAmount = invoice.amount - (invoice.amountPaid || 0);
            store.update('customers', order.customerId, {
              outstandingBalance: Math.max(0, (customer.outstandingBalance || 0) - unpaidAmount)
            });
          }
        }
      }
    } else {
      // Ensure invoice exists when transitioned to confirmed/processing/ready/completed
      const invoice = state.invoices.find(i => i.orderId === orderId);
      if (!invoice && ['confirmed', 'processing', 'ready', 'completed'].includes(newStatus)) {
        const newInvoice: Types.Invoice = {
          id: generateId(),
          orderId,
          invoiceNumber: `INV-${Date.now()}`,
          customerId: order.customerId,
          amount: order.totalAmount,
          status: newStatus === 'completed' ? 'paid' : 'unpaid',
          dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
          createdAt: now,
          amountPaid: newStatus === 'completed' ? order.totalAmount : 0
        };
        store.insert('invoices', newInvoice);

        if (order.customerId && newStatus !== 'completed') {
          const customer = state.customers.find(c => c.id === order.customerId);
          if (customer) {
            store.update('customers', order.customerId, {
              outstandingBalance: (customer.outstandingBalance || 0) + order.totalAmount
            });
          }
        }
      } else if (invoice && newStatus === 'completed' && invoice.status !== 'paid') {
        // If order becomes completed, mark invoice as paid
        const remaining = invoice.amount - (invoice.amountPaid || 0);
        store.update('invoices', invoice.id, { status: 'paid', amountPaid: invoice.amount });
        if (order.customerId) {
          const customer = state.customers.find(c => c.id === order.customerId);
          if (customer) {
            store.update('customers', order.customerId, {
              outstandingBalance: Math.max(0, (customer.outstandingBalance || 0) - remaining),
              totalSpent: (customer.totalSpent || 0) + remaining
            });
          }
        }
      }
    }

    store.update('orders', orderId, { status: newStatus, history });

    if (newStatus === 'ready') {
      eventBus.publish(Events.ORDER_STATUS_CHANGED, { orderId, status: newStatus });
    }

    return { ...order, status: newStatus, history };
  },

  /**
   * markInvoicePaid (Full/Partial Payment)
   */
  async markInvoicePaid(invoiceId: string, paymentAmount: number, method: 'cash' | 'card' | 'upi' | 'bank_transfer') {
    await delay(300);
    const state = store.getState();
    const invoice = state.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const now = new Date().toISOString();
    const currentPaid = invoice.amountPaid || 0;
    const newPaid = currentPaid + paymentAmount;
    
    let newStatus: Types.Invoice['status'] = 'paid';
    if (newPaid < invoice.amount) {
      newStatus = 'partially_paid';
    } else if (newPaid > invoice.amount) {
      throw new Error('Payment amount exceeds invoice balance');
    }

    // Update invoice status & amountPaid
    store.update('invoices', invoiceId, {
      status: newStatus,
      amountPaid: newPaid
    });

    // Record Payment
    const paymentId = generateId();
    const payment: Types.Payment = {
      id: paymentId,
      invoiceId,
      amount: paymentAmount,
      method,
      status: 'success',
      createdAt: now
    };
    store.insert('payments', payment);

    // Record LedgerEntry
    const ledgerEntry: Types.LedgerEntry = {
      id: generateId(),
      businessId: 'b-1',
      amount: paymentAmount,
      type: 'credit',
      sourceType: 'payment',
      referenceId: paymentId,
      description: `Payment for ${invoice.invoiceNumber} (${method.toUpperCase()})`,
      category: 'Receivables',
      createdAt: now
    };
    store.insert('ledgerEntries', ledgerEntry);

    // Update Customer outstanding balance and total spent
    if (invoice.customerId) {
      const customer = state.customers.find(c => c.id === invoice.customerId);
      if (customer) {
        store.update('customers', invoice.customerId, {
          outstandingBalance: Math.max(0, (customer.outstandingBalance || 0) - paymentAmount),
          totalSpent: (customer.totalSpent || 0) + paymentAmount,
          lastVisit: now
        });
      }
    }

    // Publish event
    eventBus.publish(Events.SALE_COMPLETED, { invoiceId, amountPaid: paymentAmount });
    
    return { invoice: { ...invoice, status: newStatus, amountPaid: newPaid }, payment };
  },

  /**
   * createCustomer
   */
  async createCustomer(payload: {
    businessId: string;
    name: string;
    phone?: string;
    email?: string;
    type?: 'retail' | 'wholesale';
    address?: string;
    optInForMessages?: boolean;
  }): Promise<Types.Customer> {
    await delay(200);
    const now = new Date().toISOString();
    const customer: Types.Customer = {
      id: generateId(),
      businessId: payload.businessId || 'b-1',
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      type: payload.type || 'retail',
      address: payload.address,
      optInForMessages: payload.optInForMessages ?? true,
      totalSpent: 0,
      outstandingBalance: 0,
      createdAt: now
    };
    store.insert('customers', customer);
    return customer;
  },

  /**
   * createFollowUp
   */
  async createFollowUp(payload: {
    customerId: string;
    note: string;
    dueDate: string;
    assigneeId?: string;
    isSuggested?: boolean;
  }): Promise<Types.FollowUp> {
    await delay(150);
    const now = new Date().toISOString();
    const followUp: Types.FollowUp = {
      id: generateId(),
      customerId: payload.customerId,
      note: payload.note,
      dueDate: payload.dueDate,
      assigneeId: payload.assigneeId,
      status: 'pending',
      isSuggested: payload.isSuggested || false,
      createdAt: now
    };
    store.insert('followUps', followUp);
    return followUp;
  },

  /**
   * completeFollowUp
   */
  async completeFollowUp(followUpId: string): Promise<Types.FollowUp> {
    await delay(150);
    const now = new Date().toISOString();
    const state = store.getState();
    const followUp = state.followUps.find(f => f.id === followUpId);
    if (!followUp) throw new Error('Follow-up not found');

    const updated = {
      ...followUp,
      status: 'completed' as const,
      completedAt: now
    };
    store.update('followUps', followUpId, {
      status: 'completed',
      completedAt: now
    });
    return updated;
  },

  /**
   * computeAllChurnScores
   * Computes RFM churn scores across all customer-product pairs in database.
   */
  async computeAllChurnScores(): Promise<Types.ChurnScore[]> {
    const state = store.getState();
    const pairs = new Set<string>();

    // Collect all unique (customerId, productId) from orderItems
    state.orders.forEach(order => {
      if (order.customerId && order.status !== 'cancelled') {
        const items = state.orderItems.filter(i => i.orderId === order.id);
        items.forEach(item => {
          pairs.add(`${order.customerId}|${item.productId}`);
        });
      }
    });

    const results: Types.ChurnScore[] = [];
    for (const pair of pairs) {
      const [customerId, productId] = pair.split('|');
      const score = await this.computeChurnScore(customerId, productId);
      results.push(score);
    }
    return results;
  },

  /**
   * sendCustomerMessage
   * Dispatches a message and logs to messageLogs.
   */
  async sendCustomerMessage(payload: {
    recipient: string;
    content: string;
    channel?: 'whatsapp' | 'sms' | 'email';
    customerId?: string;
  }): Promise<Types.MessageLog> {
    await delay(300);
    const now = new Date().toISOString();
    const log: Types.MessageLog = {
      id: generateId(),
      recipient: payload.recipient,
      content: payload.content,
      channel: payload.channel || 'whatsapp',
      customerId: payload.customerId,
      status: 'delivered',
      sentAt: now
    };
    store.insert('messageLogs', log);
    return log;
  },

  /**
   * markChurnScoreReviewed
   */
  async markChurnScoreReviewed(churnScoreId: string): Promise<void> {
    await delay(100);
    store.update('churnScores', churnScoreId, { reviewed: true });
  },

  /**
   * addExpense
   * Records an Expense and matching debit LedgerEntry.
   */
  async addExpense(payload: {
    businessId?: string;
    outletId: string;
    category: string;
    amount: number;
    description: string;
    date?: string;
    recordedBy?: string;
    recurring?: boolean;
    status?: 'paid' | 'unpaid';
  }): Promise<{ expense: Types.Expense; ledgerEntry: Types.LedgerEntry }> {
    await delay(200);
    const now = payload.date || new Date().toISOString();
    const expenseId = generateId();

    const expense: Types.Expense = {
      id: expenseId,
      businessId: payload.businessId || 'b-1',
      outletId: payload.outletId,
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      date: now,
      recordedBy: payload.recordedBy || 'u-1',
      recurring: payload.recurring || false,
      status: payload.status || 'paid',
      createdAt: now
    };
    store.insert('expenses', expense);

    const ledgerEntry: Types.LedgerEntry = {
      id: generateId(),
      businessId: payload.businessId || 'b-1',
      outletId: payload.outletId,
      amount: payload.amount,
      type: 'debit',
      sourceType: 'expense',
      referenceId: expenseId,
      description: payload.description,
      category: payload.category,
      createdAt: now
    };
    store.insert('ledgerEntries', ledgerEntry);

    return { expense, ledgerEntry };
  },

  /**
   * addIncome
   * Records a non-sale credit LedgerEntry.
   */
  async addIncome(payload: {
    businessId?: string;
    outletId?: string;
    category?: string;
    amount: number;
    description: string;
    date?: string;
  }): Promise<Types.LedgerEntry> {
    await delay(200);
    const now = payload.date || new Date().toISOString();
    const ledgerEntry: Types.LedgerEntry = {
      id: generateId(),
      businessId: payload.businessId || 'b-1',
      outletId: payload.outletId,
      amount: payload.amount,
      type: 'credit',
      sourceType: 'income',
      referenceId: generateId(),
      description: payload.description,
      category: payload.category || 'Other Income',
      createdAt: now
    };
    store.insert('ledgerEntries', ledgerEntry);
    return ledgerEntry;
  },

  /**
   * createEmployee
   */
  async createEmployee(payload: {
    businessId: string;
    outletId?: string;
    name: string;
    role: string;
    department?: string;
    phone: string;
    email?: string;
    joiningDate: string;
    salary: number;
    status?: 'active' | 'inactive';
    panNumber?: string;
    bankDetails?: { accountNo: string; ifsc: string; bankName: string };
    emergencyContact?: { name: string; relation: string; phone: string };
  }): Promise<Types.Employee> {
    await delay(200);
    const employee: Types.Employee = {
      id: `e-${generateId()}`,
      businessId: payload.businessId || 'b-1',
      outletId: payload.outletId || 'o-1',
      name: payload.name,
      role: payload.role,
      department: payload.department || 'Operations',
      phone: payload.phone,
      email: payload.email,
      joiningDate: payload.joiningDate,
      salary: payload.salary,
      hourlyRate: Math.round(payload.salary / (30 * 8)),
      status: payload.status || 'active',
      leaveBalance: {
        paid: 12,
        casual: 8,
        sick: 6
      },
      panNumber: payload.panNumber,
      bankDetails: payload.bankDetails,
      emergencyContact: payload.emergencyContact
    };
    store.insert('employees', employee);
    return employee;
  },

  /**
   * updateEmployee
   */
  async updateEmployee(id: string, updates: Partial<Types.Employee>): Promise<Types.Employee> {
    await delay(150);
    const state = store.getState();
    const emp = state.employees.find(e => e.id === id);
    if (!emp) throw new Error('Employee not found');

    const updated = { ...emp, ...updates };
    store.update('employees', id, updates);
    return updated;
  },

  /**
   * recordAttendance
   * Records or updates check-in/out and status for an employee on a given date.
   * Enforces single status per day and flags incomplete check-outs & past edits.
   */
  async recordAttendance(payload: {
    employeeId: string;
    date: string; // YYYY-MM-DD
    status: 'present' | 'absent' | 'late' | 'leave';
    checkIn?: string;
    checkOut?: string;
    notes?: string;
  }): Promise<Types.AttendanceRecord> {
    await delay(150);
    const state = store.getState();
    const existing = state.attendanceRecords.find(
      r => r.employeeId === payload.employeeId && r.date === payload.date
    );

    // Compute working hours
    let hoursWorked = 0;
    let isIncomplete = false;

    if (payload.status === 'present' || payload.status === 'late') {
      if (payload.checkIn && payload.checkOut) {
        const res = computeWorkingHours(payload.checkIn, payload.checkOut);
        hoursWorked = res.hours;
        isIncomplete = res.isIncomplete;
      } else if (payload.checkIn && !payload.checkOut) {
        hoursWorked = 0;
        isIncomplete = true; // Incomplete checkout flag
      } else {
        hoursWorked = payload.status === 'late' ? 7.5 : 8.0;
        isIncomplete = false;
      }
    } else {
      hoursWorked = 0;
      isIncomplete = false;
    }

    // Determine if this is an edit to a past date
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = payload.date < todayStr;
    const isEdited = existing ? true : isPastDate;

    const record: Types.AttendanceRecord = {
      id: existing?.id || `att-${generateId()}`,
      employeeId: payload.employeeId,
      date: payload.date,
      status: payload.status,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      hoursWorked,
      isIncomplete,
      isEdited: existing ? true : (isEdited || false),
      notes: payload.notes
    };

    if (existing) {
      store.update('attendanceRecords', existing.id, record);
    } else {
      store.insert('attendanceRecords', record);
    }

    return record;
  },

  /**
   * bulkMarkAttendance
   * Quick-marks all specified employees for a given day with optional exception adjustments.
   */
  async bulkMarkAttendance(payload: {
    date: string; // YYYY-MM-DD
    records: {
      employeeId: string;
      status: 'present' | 'absent' | 'late' | 'leave';
      checkIn?: string;
      checkOut?: string;
      notes?: string;
    }[];
  }): Promise<Types.AttendanceRecord[]> {
    await delay(300);
    const results: Types.AttendanceRecord[] = [];
    for (const item of payload.records) {
      const record = await this.recordAttendance({
        employeeId: item.employeeId,
        date: payload.date,
        status: item.status,
        checkIn: item.checkIn || (item.status === 'present' ? '09:00' : item.status === 'late' ? '10:00' : undefined),
        checkOut: item.checkOut || (['present', 'late'].includes(item.status) ? '18:00' : undefined),
        notes: item.notes
      });
      results.push(record);
    }
    return results;
  },

  /**
   * applyLeave
   */
  async applyLeave(payload: {
    employeeId: string;
    type: 'paid' | 'casual' | 'sick' | 'unpaid';
    startDate: string;
    endDate: string;
    reason: string;
    approvedBy?: string;
  }): Promise<Types.LeaveRecord> {
    await delay(200);
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave: Types.LeaveRecord = {
      id: `lv-${generateId()}`,
      employeeId: payload.employeeId,
      type: payload.type,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days,
      reason: payload.reason,
      status: 'approved',
      appliedOn: new Date().toISOString(),
      approvedBy: payload.approvedBy || 'u-1'
    };
    store.insert('leaveRecords', leave);

    // Automatically mark attendance as leave for each day in range
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      await this.recordAttendance({
        employeeId: payload.employeeId,
        date: dateStr,
        status: 'leave',
        notes: `Approved ${payload.type} leave: ${payload.reason}`
      });
      curr.setDate(curr.getDate() + 1);
    }

    return leave;
  }
};

/**
 * Parses time strings like "09:30", "09:30 AM", "18:00" and calculates hours worked.
 */
export function computeWorkingHours(checkIn?: string, checkOut?: string): { hours: number; isIncomplete: boolean } {
  if (!checkIn) return { hours: 0, isIncomplete: false };
  if (!checkOut) return { hours: 0, isIncomplete: true };

  const parseTime = (t: string): number | null => {
    const match = t.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const inMins = parseTime(checkIn);
  const outMins = parseTime(checkOut);

  if (inMins === null || outMins === null) {
    return { hours: 0, isIncomplete: true };
  }

  let diff = outMins - inMins;
  if (diff < 0) diff += 24 * 60; // Overnight shift

  const hours = Math.round((diff / 60) * 10) / 10;
  return { hours, isIncomplete: false };
}

/**
 * ATTENDANCE TO PAYROLL INTEGRATION FORMULA (Prompt 13 & 14):
 * 
 * 1. Daily Rate = Base Salary / 30
 * 2. Unpaid Days = (Unpaid Leave Days) + (Absent Days) + (Incomplete / Unexcused Days)
 * 3. Attendance Deduction = Unpaid Days * Daily Rate
 * 4. Gross Earnings = Base Salary - Attendance Deduction
 * 5. Net Pay = Gross Earnings - Statutory Deductions (e.g., PF/TDS)
 */
export function computeAttendancePayrollDeduction(baseSalary: number, absentDays: number, unpaidLeaveDays: number): {
  dailyRate: number;
  totalUnpaidDays: number;
  deductionAmount: number;
  grossPayable: number;
} {
  const dailyRate = Math.round((baseSalary / 30) * 100) / 100;
  const totalUnpaidDays = absentDays + unpaidLeaveDays;
  const deductionAmount = Math.round(totalUnpaidDays * dailyRate);
  const grossPayable = Math.max(0, baseSalary - deductionAmount);
  return { dailyRate, totalUnpaidDays, deductionAmount, grossPayable };
}

