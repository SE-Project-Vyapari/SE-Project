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
  }
};
