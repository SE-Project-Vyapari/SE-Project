import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { store, useStore } from '../services/store';
import * as Types from '../types';
import { eventBus, Events } from '../services/eventBus';

interface NotificationContextProps {
  notifications: Types.Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  rules: Types.NotificationRule[];
  toggleRule: (id: string) => void;
  addRule: (rule: Omit<Types.NotificationRule, 'id' | 'businessId'>) => void;
  deleteRule: (id: string) => void;
  messageLogs: Types.MessageLog[];
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const notifications = useStore(state => state.notifications);
  const rules = useStore(state => state.notificationRules);
  const messageLogs = useStore(state => state.messageLogs);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Subscribe to event bus for notifications and message logs
  useEffect(() => {
    const processRules = (eventName: string, payload: any, notification: Types.Notification) => {
      // 1. Always generate in-app notification
      store.addNotification(notification);

      // 2. Check for automation rules
      const activeRules = store.getState().notificationRules.filter(
        r => r.enabled && r.triggerEvent === eventName
      );

      activeRules.forEach(rule => {
        if (rule.action === 'sms' || rule.action === 'email' || rule.action === 'whatsapp') {
          // Send mock message
          import('../services/mockMessaging').then(({ sendMessage }) => {
            // Recipient could be resolved from payload.customerId or default to business contact
            sendMessage(
              payload.customerId || 'admin@business.com', 
              rule.action as any, 
              `template_${eventName}`, 
              payload
            );
          });
        }
      });
    };

    // Message log creation
    const unsubLogCreated = eventBus.subscribe(Events.MESSAGE_LOG_CREATED, (payload) => {
      store.addMessageLog(payload as Types.MessageLog);
    });
    // Message status updates
    const unsubLogStatus = eventBus.subscribe(Events.MESSAGE_STATUS_UPDATED, (payload: any) => {
      store.updateMessageLogStatus(payload.id, payload.status);
    });
    // Stock below threshold
    const unsubStock = eventBus.subscribe(Events.STOCK_BELOW_THRESHOLD, (payload: any) => {
      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || '',
        title: 'Stock Below Threshold',
        message: `Product ${payload.productId} at outlet ${payload.outletId} is low (${payload.remaining})`,
        type: 'warning',
        read: false,
        createdAt: new Date().toISOString(),
      };
      processRules('stock.belowThreshold', payload, notif);
    });
    // Order status changed to ready
    const unsubOrder = eventBus.subscribe(Events.ORDER_STATUS_CHANGED, (payload: any) => {
      if (payload.status === 'ready') {
        const notif: Types.Notification = {
          id: crypto.randomUUID(),
          businessId: payload.businessId || '',
          title: 'Order Ready',
          message: `Order ${payload.orderId} is ready for pickup.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        };
        processRules('order.statusChanged', payload, notif);
      }
    });
    // Invoice overdue
    const unsubInvoice = eventBus.subscribe(Events.INVOICE_OVERDUE, (payload: any) => {
      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || '',
        title: 'Invoice Overdue',
        message: `Invoice ${payload.invoiceId} is overdue.`,
        type: 'alert',
        read: false,
        createdAt: new Date().toISOString(),
      };
      processRules('invoice.overdue', payload, notif);
    });
    // Churn risk change
    const unsubChurn = eventBus.subscribe(Events.CHURN_RISK_CHANGED, (payload: any) => {
      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || '',
        title: 'Churn Risk Updated',
        message: `Customer ${payload.customerId} churn risk is now ${payload.riskLevel}.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      };
      processRules('customer.churnRisk', payload, notif);
    });
    // Payroll processed
    const unsubPayroll = eventBus.subscribe(Events.PAYROLL_PROCESSED, (payload: any) => {
      const notif: Types.Notification = {
        id: crypto.randomUUID(),
        businessId: payload.businessId || '',
        title: 'Payroll Processed',
        message: `Payroll run ${payload.payrollRunId} processed. Total amount ${payload.totalAmount}`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      };
      processRules('payroll.processed', payload, notif);
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
      businessId: 'default-biz' // Hardcoded for now since mock environment
    });
  };

  const deleteRule = (id: string) => store.deleteRule(id);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        rules,
        toggleRule,
        addRule,
        deleteRule,
        messageLogs,
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
