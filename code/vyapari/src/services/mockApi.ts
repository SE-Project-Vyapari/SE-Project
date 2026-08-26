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
    // (For this mock, we assume 'processing', 'ready', 'completed' mean stock is gone,
    // so if transitioning to 'cancelled' or 'returned' from those, we restock).
    // The prompt says "Cancelling/returning an order must reverse the relevant InventoryRecord decrement"
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

    store.update('orders', orderId, { status: newStatus, history });

    if (newStatus === 'ready') {
      eventBus.publish(Events.ORDER_STATUS_CHANGED, { orderId, status: newStatus });
    }

    return { ...order, status: newStatus, history };
  }
};
