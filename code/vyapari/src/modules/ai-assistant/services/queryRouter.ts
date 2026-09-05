import type { AppState } from '../../../services/store';

export type AssistantIntentType =
  | 'sales_summary'
  | 'low_stock'
  | 'reorder_suggestions'
  | 'order_status'
  | 'at_risk_customers'
  | 'biggest_expenses'
  | 'unpaid_invoices'
  | 'faq_add_product'
  | 'faq_return_refund'
  | 'faq_payroll'
  | 'faq_stock_transfer'
  | 'faq_gst_invoice'
  | 'unknown_fallback';

export interface RouteResult {
  intent: AssistantIntentType;
  confidence: number;
  extractedParams: {
    orderId?: string;
    productQuery?: string;
  };
  resolved: boolean;
}

export function classifyQuery(rawQuery: string, state: AppState): RouteResult {
  const q = rawQuery.trim().toLowerCase();

  if (!q) {
    return {
      intent: 'unknown_fallback',
      confidence: 0,
      extractedParams: {},
      resolved: false
    };
  }

  // 1. Check for Order Status Lookup by Order ID Pattern (e.g. "ord-90d-1-0", "ORD-1042", "#ord-1", "order 101")
  // Check if query contains "status", "track", "where is order", "order"
  const isOrderQuery =
    q.includes('order') ||
    q.includes('status') ||
    q.includes('track') ||
    q.includes('delivery') ||
    q.includes('ord-');

  if (isOrderQuery) {
    // Try to find matching real order ID in state.orders
    const directOrder = state.orders.find(
      o =>
        q.includes(o.id.toLowerCase()) ||
        q.replace(/[^\w-]/g, '').includes(o.id.toLowerCase().replace(/[^\w-]/g, ''))
    );

    if (directOrder) {
      return {
        intent: 'order_status',
        confidence: 0.98,
        extractedParams: { orderId: directOrder.id },
        resolved: true
      };
    }

    // If order was explicitly mentioned with an ID that might not exist
    const potentialIdMatch = q.match(/(?:ord-[\w\d-]+|ord\d+|order\s*#?([a-z0-9-]+))/i);
    if (potentialIdMatch) {
      const parsedId = potentialIdMatch[0].replace(/^order\s*#?/i, '').trim();
      return {
        intent: 'order_status',
        confidence: 0.9,
        extractedParams: { orderId: parsedId },
        resolved: true
      };
    }
  }

  // 2. Low Stock Lookup Intent
  if (
    q.includes('low stock') ||
    q.includes('out of stock') ||
    q.includes('stockout') ||
    q.includes('running out') ||
    q.includes('stock alert') ||
    q.includes('shortage') ||
    q.includes('low inventory') ||
    (q.includes('stock') && (q.includes('low') || q.includes('check') || q.includes('depleted') || q.includes('below')))
  ) {
    return {
      intent: 'low_stock',
      confidence: 0.95,
      extractedParams: {},
      resolved: true
    };
  }

  // 3. Reorder Suggestions Intent (Prompt 16 connection)
  if (
    q.includes('reorder') ||
    q.includes('restock') ||
    q.includes('replenish') ||
    q.includes('what should i buy') ||
    q.includes('what to order') ||
    q.includes('purchase order') ||
    q.includes('forecast demand') ||
    (q.includes('need') && q.includes('restock'))
  ) {
    return {
      intent: 'reorder_suggestions',
      confidence: 0.95,
      extractedParams: {},
      resolved: true
    };
  }

  // 4. Sales Summary Intent
  if (
    q.includes('today sales') ||
    q.includes("today's sales") ||
    q.includes('sales today') ||
    q.includes('daily sales') ||
    q.includes('sales summary') ||
    q.includes('revenue today') ||
    q.includes('how much did we sell') ||
    q.includes('recent sales') ||
    q.includes('todays revenue') ||
    q.includes('performance today')
  ) {
    return {
      intent: 'sales_summary',
      confidence: 0.95,
      extractedParams: {},
      resolved: true
    };
  }

  // 5. At-Risk Customers / Churn Intelligence (Prompt 11 connection)
  if (
    q.includes('at risk') ||
    q.includes('churn') ||
    q.includes('losing customer') ||
    q.includes('inactive customer') ||
    q.includes('risk customer') ||
    q.includes('who might leave') ||
    q.includes('stop buying') ||
    q.includes('retention')
  ) {
    return {
      intent: 'at_risk_customers',
      confidence: 0.95,
      extractedParams: {},
      resolved: true
    };
  }

  // 6. Biggest Expenses This Month (Prompt 12 connection)
  if (
    q.includes('biggest expense') ||
    q.includes('top expense') ||
    q.includes('expenses this month') ||
    q.includes('where is money going') ||
    q.includes('monthly expense') ||
    q.includes('highest expense') ||
    q.includes('spending this month') ||
    q.includes('overhead cost') ||
    q.includes('expense breakdown')
  ) {
    return {
      intent: 'biggest_expenses',
      confidence: 0.95,
      extractedParams: {},
      resolved: true
    };
  }

  // 7. Unpaid / Overdue Invoices (Prompt 09 connection)
  if (
    q.includes('unpaid invoice') ||
    q.includes('overdue invoice') ||
    q.includes('pending invoice') ||
    q.includes('receivable') ||
    q.includes('outstanding invoice') ||
    q.includes('unpaid bill') ||
    q.includes('who owes money') ||
    q.includes('due invoice') ||
    q.includes('debtor')
  ) {
    return {
      intent: 'unpaid_invoices',
      confidence: 0.95,
      extractedParams: {},
      resolved: true
    };
  }

  // 8. General FAQs & Operational Help Guides
  if (q.includes('add product') || q.includes('create product') || q.includes('new product') || q.includes('add item')) {
    return { intent: 'faq_add_product', confidence: 0.92, extractedParams: {}, resolved: true };
  }

  if (q.includes('return') || q.includes('refund') || q.includes('exchange')) {
    return { intent: 'faq_return_refund', confidence: 0.92, extractedParams: {}, resolved: true };
  }

  if (q.includes('payroll') || q.includes('salary') || q.includes('pay employee') || q.includes('wage')) {
    return { intent: 'faq_payroll', confidence: 0.92, extractedParams: {}, resolved: true };
  }

  if (q.includes('transfer') || q.includes('inter store') || q.includes('move inventory') || q.includes('between outlet')) {
    return { intent: 'faq_stock_transfer', confidence: 0.92, extractedParams: {}, resolved: true };
  }

  if (q.includes('gst') || q.includes('tax invoice') || q.includes('print invoice') || q.includes('bill format')) {
    return { intent: 'faq_gst_invoice', confidence: 0.92, extractedParams: {}, resolved: true };
  }

  // 9. Unmatched Fallback
  return {
    intent: 'unknown_fallback',
    confidence: 0.2,
    extractedParams: {},
    resolved: false
  };
}
