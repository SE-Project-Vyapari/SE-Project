type EventCallback = (payload?: any) => void;

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /** When true, events are dropped (used while bulk-seeding demo data). */
  muted = false;

  publish(event: string, payload?: any): void {
    if (this.muted) return;
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(payload));
    }
  }
}

export const eventBus = new EventBus();

// List of expected events to maintain standard string usage
export const Events = {
  SALE_COMPLETED: 'sale.completed',
  STOCK_BELOW_THRESHOLD: 'stock.belowThreshold',
  ORDER_STATUS_CHANGED: 'order.statusChanged',
  INVOICE_OVERDUE: 'invoice.overdue',
  CHURN_RISK_CHANGED: 'churn.riskChanged',
  PAYROLL_PROCESSED: 'payroll.processed',
  // Messaging events
  MESSAGE_LOG_CREATED: 'message.logCreated',
  MESSAGE_STATUS_UPDATED: 'message.statusUpdated',
} as const;
