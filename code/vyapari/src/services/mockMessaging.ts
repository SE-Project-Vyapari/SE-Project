
import * as Types from '../types';
import { eventBus, Events } from './eventBus';

/**
 * Configuration constant – probability that a simulated message fails.
 * Adjusted via the implementation plan (10% failure rate).
 */
const FAILURE_RATE = 0.1; // 10% chance of failure

/**
 * Message status progression stages.
 */
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';

/**
 * Simulated sendMessage function.
 * It creates a MessageLogEntry with status `queued` and then advances the
 * status over time using setTimeout.
 *
 * @param recipient   Customer object or plain string (phone/email)
 * @param channel     'whatsapp' | 'sms' | 'email'
 * @param templateId  Identifier of the message template used
 * @param data        Arbitrary data used for template interpolation (for preview purposes only)
 */
export async function sendMessage(
  recipient: Types.Customer | string,
  channel: 'whatsapp' | 'sms' | 'email',
  templateId: string,
  _data: Record<string, any>
): Promise<Types.MessageLog> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const recipientId = typeof recipient === 'string' ? recipient : recipient.id;
  const optedIn = typeof recipient === 'string' ? true : recipient.optedIn ?? true;

  const baseLog: Types.MessageLog = {
    id,
    recipient: recipientId,
    content: templateId, // store template identifier; actual rendered content can be generated elsewhere
    status: optedIn ? 'queued' : 'skipped',
    channel,
    customerId: typeof recipient === 'object' ? recipient.id : undefined,
    sentAt: now,
  };

  // Insert the initial log into the global store (via eventBus for observers)
  eventBus.publish(Events.MESSAGE_LOG_CREATED, baseLog);

  if (!optedIn) {
    // No further progression needed – opted out
    return baseLog;
  }

  // Progress to 'sent' after ~1s
  setTimeout(() => {
    eventBus.publish(Events.MESSAGE_STATUS_UPDATED, { id, status: 'sent' } as any);
  }, 1000);

  // Progress to 'delivered' or 'failed' after additional 1‑2s
  setTimeout(() => {
    const isFailed = Math.random() < FAILURE_RATE;
    const finalStatus: MessageStatus = isFailed ? 'failed' : 'delivered';
    eventBus.publish(Events.MESSAGE_STATUS_UPDATED, { id, status: finalStatus } as any);
  }, 2500);

  return baseLog;
}
