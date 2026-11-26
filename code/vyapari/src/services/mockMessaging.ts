/**
 * Mock / Sandbox Messaging Service (WhatsApp & SMS Simulation)
 *
 * NOTE: This is a local sandbox simulator. No real WhatsApp Business API
 * or Twilio credentials are required or used.
 */
import * as Types from '../types';
import { eventBus, Events } from './eventBus';

const FAILURE_RATE = 0.1; // 10% simulated failure rate for realism

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';

export const DEFAULT_TEMPLATES: Record<string, { name: string; body: string }> = {
  'stock.belowThreshold': {
    name: 'Low Stock Alert',
    body: 'Low Stock Alert: {{productName}} at {{outletName}} has dropped to {{remaining}} units (reorder level: {{reorderLevel}}). Please restock soon.',
  },
  'order.statusChanged': {
    name: 'Order Ready Notification',
    body: 'Hi {{customerName}}, your order #{{orderId}} (Rs. {{amount}}) is now READY for pickup at {{outletName}}. Thank you for shopping with Vyapari!',
  },
  'churn.riskChanged': {
    name: 'Customer Retention Offer',
    body: 'Hi {{customerName}}, we miss you at Vyapari Superstore! Enjoy 10% off your next order of {{favoriteProduct}} this week.',
  },
  'invoice.overdue': {
    name: 'Overdue Invoice Reminder',
    body: 'Reminder: Invoice #{{invoiceNumber}} for Rs. {{amount}} is overdue. Please settle at your earliest convenience.',
  },
  'payroll.processed': {
    name: 'Payroll Processed Summary',
    body: 'Payroll run {{payrollRunId}} has been processed. Total disbursed: Rs. {{totalAmount}}.',
  },
};

export function interpolateTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

export function isCustomerOptedIn(customer: Types.Customer): boolean {
  if (customer.optedIn === false || customer.optInForMessages === false) {
    return false;
  }
  return true;
}

function scheduleDeliveryProgression(id: string) {
  // Stage 1: Queued -> Sent (~1s)
  setTimeout(() => {
    eventBus.publish(Events.MESSAGE_STATUS_UPDATED, {
      id,
      status: 'sent' as MessageStatus,
      delayMs: 1000,
    });
  }, 1000);

  // Stage 2: Sent -> Delivered or Failed (~2.5s)
  setTimeout(() => {
    const isFailed = Math.random() < FAILURE_RATE;
    const finalStatus: MessageStatus = isFailed ? 'failed' : 'delivered';
    eventBus.publish(Events.MESSAGE_STATUS_UPDATED, {
      id,
      status: finalStatus,
      delayMs: 2500,
      errorReason: isFailed ? 'Simulated gateway timeout (sandbox)' : undefined,
    });
  }, 2500);
}

/**
 * Simulated sendMessage function.
 * Enforces Customer opt-in before queueing; simulates Queued -> Sent -> Delivered/Failed.
 */
export async function sendMessage(
  recipient: Types.Customer | string,
  channel: 'whatsapp' | 'sms' | 'email',
  templateKeyOrName: string,
  data: Record<string, any>,
  customTemplateBody?: string
): Promise<Types.MessageLog> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const isCustomerObj = typeof recipient === 'object' && recipient !== null;
  const recipientContact = isCustomerObj
    ? recipient.phone || recipient.email || recipient.name
    : recipient;
  const recipientName = isCustomerObj ? recipient.name : recipient;
  const optedIn = isCustomerObj ? isCustomerOptedIn(recipient) : true;

  const tpl = DEFAULT_TEMPLATES[templateKeyOrName];
  const templateName = tpl?.name || templateKeyOrName;
  const rawBody = customTemplateBody || tpl?.body || templateKeyOrName;
  const renderedContent = interpolateTemplate(rawBody, data);

  const baseLog: Types.MessageLog = {
    id,
    recipient: recipientContact,
    recipientName,
    content: renderedContent,
    templateName,
    status: optedIn ? 'queued' : 'skipped',
    channel,
    customerId: isCustomerObj ? recipient.id : undefined,
    delayMs: 0,
    errorReason: optedIn ? undefined : 'Customer opted out of automated messages',
    sentAt: now,
  };

  eventBus.publish(Events.MESSAGE_LOG_CREATED, baseLog);

  if (!optedIn) {
    return baseLog;
  }

  scheduleDeliveryProgression(id);
  return baseLog;
}

/**
 * Retries a failed simulated message from Queued -> Sent -> Delivered/Failed.
 */
export function retryMessage(log: Types.MessageLog): void {
  const retryCount = (log.retryCount || 0) + 1;
  eventBus.publish(Events.MESSAGE_STATUS_UPDATED, {
    id: log.id,
    status: 'queued' as MessageStatus,
    delayMs: 0,
    errorReason: undefined,
    retryCount,
    sentAt: new Date().toISOString(),
  });
  scheduleDeliveryProgression(log.id);
}
