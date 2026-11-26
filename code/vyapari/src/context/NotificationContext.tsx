import { createContext, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { store, useStore } from '../services/store';
import * as Types from '../types';
import { eventBus, Events } from '../services/eventBus';
import { sendMessage, retryMessage as retryMockMessage } from '../services/mockMessaging';

interface NotificationContextProps {
  notifications: Types.Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  isNotificationResolved: (n: Types.Notification) => boolean;
  rules: Types.NotificationRule[];
  toggleRule: (id: string) => void;
  addRule: (rule: Omit<Types.NotificationRule, 'id' | 'businessId'>) => void;
  deleteRule: (id: string) => void;
  messageLogs: Types.MessageLog[];
  retryMessage: (log: Types.MessageLog) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const DEDUPE_WINDOW_MS = 60_000; // 60 seconds per entity+event

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const notifications = useStore(state => state.notifications);
  const rules = useStore(state => state.notificationRules);
  const messageLogs = useStore(state => state.messageLogs);
  const inventoryRecords = useStore(state => state.inventoryRecords);
  const orders = useStore(state => state.orders);
  const invoices = useStore(state => state.invoices);
  const churnScores = useStore(state => state.churnScores);

  const isNotificationResolved = useCallback(
    (n: Types.Notification): boolean => {
      if (n.resolved) return true;
      if (!n.entityType || !n.entityId) return false;

      if (n.entityType === 'product') {
        const recs = inventoryRecords.filter(r => r.productId === n.entityId);
        return recs.length > 0 && recs.every(r => r.quantity > r.reorderLevel);
      }
      if (n.entityType === 'order') {
        const ord = orders.find(o => o.id === n.entityId);
        return !!ord && (ord.status === 'completed' || ord.status === 'cancelled' || ord.status === 'returned');
      }
      if (n.entityType === 'invoice') {
        const inv = invoices.find(i => i.id === n.entityId);
        return !!inv && (inv.status === 'paid' || inv.status === 'cancelled');
      }
      if (n.entityType === 'customer') {
        const score = churnScores.find(c => c.customerId === n.entityId);
        return !!score && (score.reviewed === true || score.riskLevel !== 'high');
      }
      return false;
    },
    [inventoryRecords, orders, invoices, churnScores]
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const isDuplicate = (entityType: string | undefined, entityId: string | undefined, title: string): boolean => {
      if (!entityType || !entityId) return false;
      const now = Date.now();
      return store.getState().notifications.some(
        existing =>
          existing.entityType === entityType &&
          existing.entityId === entityId &&
          existing.title === title &&
          now - new Date(existing.createdAt).getTime() < DEDUPE_WINDOW_MS
      );
    };

    const processRules = (
      eventName: string,
      templateData: Record<string, any>,
      notification: Types.Notification,
      customer?: Types.Customer
    ) => {
      if (isDuplicate(notification.entityType, notification.entityId, notification.title)) {
        return;
      }

      store.addNotification(notification);

      const activeRules = store
        .getState()
        .notificationRules.filter(r => r.enabled && r.triggerEvent === eventName);

      activeRules.forEach(rule => {
        if (rule.action === 'sms' || rule.action === 'email' || rule.action === 'whatsapp') {
          const recipient: Types.Customer | string = customer || 'Owner / Manager (+91 98100 00001)';
          sendMessage(recipient, rule.action, eventName, templateData, rule.template);
        }
      });
    };

    const unsubLogCreated = eventBus.subscribe(Events.MESSAGE_LOG_CREATED, payload => {
      store.addMessageLog(payload as Types.MessageLog);
    });

    const unsubLogStatus = eventBus.subscribe(Events.MESSAGE_STATUS_UPDATED, (payload: any) => {
      const { id, status, ...extra } = payload;
      store.updateMessageLogStatus(id, status, extra);
    });

    const unsubStock = eventBus.subscribe(Events.STOCK_BELOW_THRESHOLD, (payload: any) => {
      const state = store.getState();
      const product = state.products.find(p => p.id === payload.productId);
      const outlet = state.outlets.find(o => o.id === payload.outletId);
      const inv = state.inventoryRecords.find(
        r => r.productId === payload.productId && r.outletId === payload.outletId
      );
      const productName = product?.name || payload.productId;
      const outletName = outlet?.name || payload.outletId;
      const reorderLevel = inv?.reorderLevel ?? 10;

      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || 'b-1',
        title: 'Low Stock Alert',
        message: `${productName} at ${outletName} is low (${payload.remaining} left, reorder at ${reorderLevel}).`,
        type: 'warning',
        category: 'Inventory',
        priority: 'warning',
        entityType: 'product',
        entityId: payload.productId,
        actionUrl: `/inventory/${payload.productId}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      processRules(
        Events.STOCK_BELOW_THRESHOLD,
        {
          productName,
          outletName,
          remaining: payload.remaining,
          reorderLevel,
        },
        notif
      );
    });

    const unsubOrder = eventBus.subscribe(Events.ORDER_STATUS_CHANGED, (payload: any) => {
      if (payload.status !== 'ready') return;
      const state = store.getState();
      const order = state.orders.find(o => o.id === payload.orderId);
      const customerId = payload.customerId || order?.customerId;
      const customer = customerId ? state.customers.find(c => c.id === customerId) : undefined;
      const outlet = order ? state.outlets.find(o => o.id === order.outletId) : undefined;
      const outletName = outlet?.name || 'Downtown Branch';

      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || 'b-1',
        title: 'Order Ready for Pickup',
        message: `Order #${payload.orderId}${customer ? ` for ${customer.name}` : ''} is ready for pickup at ${outletName}.`,
        type: 'info',
        category: 'Orders',
        priority: 'info',
        entityType: 'order',
        entityId: payload.orderId,
        actionUrl: `/orders/${payload.orderId}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      processRules(
        Events.ORDER_STATUS_CHANGED,
        {
          customerName: customer?.name || 'Valued Customer',
          orderId: payload.orderId,
          amount: order?.totalAmount ?? 0,
          outletName,
        },
        notif,
        customer
      );
    });

    const unsubInvoice = eventBus.subscribe(Events.INVOICE_OVERDUE, (payload: any) => {
      const state = store.getState();
      const invoice = state.invoices.find(i => i.id === payload.invoiceId);
      const customerId = payload.customerId || invoice?.customerId;
      const customer = customerId ? state.customers.find(c => c.id === customerId) : undefined;
      const invoiceNumber = invoice?.invoiceNumber || payload.invoiceId;

      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || 'b-1',
        title: 'Invoice Overdue',
        message: `Invoice ${invoiceNumber}${customer ? ` (${customer.name})` : ''} is overdue.`,
        type: 'alert',
        category: 'Finance',
        priority: 'critical',
        entityType: 'invoice',
        entityId: payload.invoiceId,
        actionUrl: `/invoices/${payload.invoiceId}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      processRules(
        Events.INVOICE_OVERDUE,
        {
          invoiceNumber,
          amount: invoice?.amount ?? 0,
          customerName: customer?.name || 'Customer',
        },
        notif,
        customer
      );
    });

    const unsubChurn = eventBus.subscribe(Events.CHURN_RISK_CHANGED, (payload: any) => {
      if (payload.riskLevel !== 'high') return;
      const state = store.getState();
      const customer = state.customers.find(c => c.id === payload.customerId);
      const product = payload.productId
        ? state.products.find(p => p.id === payload.productId)
        : undefined;
      const customerName = customer?.name || payload.customerId;

      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || 'b-1',
        title: 'High Churn Risk Detected',
        message: `${customerName} crossed into High churn risk (score ${payload.score}).`,
        type: 'warning',
        category: 'Customers',
        priority: 'warning',
        entityType: 'customer',
        entityId: payload.customerId,
        actionUrl: `/customers/${payload.customerId}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      processRules(
        Events.CHURN_RISK_CHANGED,
        {
          customerName,
          favoriteProduct: product?.name || 'your favorite items',
          score: payload.score,
        },
        notif,
        customer
      );
    });

    const unsubPayroll = eventBus.subscribe(Events.PAYROLL_PROCESSED, (payload: any) => {
      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || 'b-1',
        title: 'Payroll Processed',
        message: `Payroll run ${payload.payrollRunId} processed (Rs. ${Number(payload.totalAmount || 0).toLocaleString('en-IN')}).`,
        type: 'info',
        category: 'Finance',
        priority: 'info',
        entityType: 'payroll',
        entityId: payload.payrollRunId,
        actionUrl: '/payroll',
        read: false,
        createdAt: new Date().toISOString(),
      };

      processRules(
        Events.PAYROLL_PROCESSED,
        {
          payrollRunId: payload.payrollRunId,
          totalAmount: payload.totalAmount,
        },
        notif
      );
    });

    return () => {
      unsubLogCreated();
      unsubLogStatus();
      unsubStock();
      unsubOrder();
      unsubInvoice();
      unsubChurn();
      unsubPayroll();
    };
  }, []);

  const markAsRead = (id: string) => store.markNotificationRead(id);
  const markAllRead = () => store.markAllNotificationsRead();
  const toggleRule = (id: string) => store.toggleRuleEnabled(id);

  const addRule = (rule: Omit<Types.NotificationRule, 'id' | 'businessId'>) => {
    store.addRule({
      ...rule,
      id: crypto.randomUUID(),
      businessId: 'b-1',
    });
  };

  const deleteRule = (id: string) => store.deleteRule(id);
  const retryMessage = (log: Types.MessageLog) => retryMockMessage(log);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        isNotificationResolved,
        rules,
        toggleRule,
        addRule,
        deleteRule,
        messageLogs,
        retryMessage,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return ctx;
};
