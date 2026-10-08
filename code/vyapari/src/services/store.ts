import * as Types from '../types';

export interface AppState {
  businesses: Types.Business[];
  outlets: Types.Outlet[];
  users: Types.User[];
  employees: Types.Employee[];
  products: Types.Product[];
  inventoryRecords: Types.InventoryRecord[];
  stockMovements: Types.StockMovement[];
  stockTransfers: Types.StockTransfer[];
  customers: Types.Customer[];
  customerProductStats: Types.CustomerProductStat[];
  orders: Types.Order[];
  orderItems: Types.OrderItem[];
  invoices: Types.Invoice[];
  invoiceLineItems: Types.InvoiceLineItem[];
  sales: Types.Sale[];
  payments: Types.Payment[];
  expenses: Types.Expense[];
  ledgerEntries: Types.LedgerEntry[];
  attendanceRecords: Types.AttendanceRecord[];
  payrollRuns: Types.PayrollRun[];
  payrollLineItems: Types.PayrollLineItem[];
  forecastEntries: Types.ForecastEntry[];
  churnScores: Types.ChurnScore[];
  notifications: Types.Notification[];
  notificationRules: Types.NotificationRule[];
  messageLogs: Types.MessageLog[];
  chatbotQueryLogs: Types.ChatbotQueryLog[];
  auditEvents: Types.AuditEvent[];
  followUps: Types.FollowUp[];
  leaveRecords: Types.LeaveRecord[];
}

type Listener = () => void;

class Store {
  private readonly STORAGE_KEY = 'vyapari_store';
  private state: AppState = this.loadFromStorage();
  
  private listeners: Set<Listener> = new Set();

  // ---------- Persistence ----------
  private loadFromStorage(): AppState {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        return { ...this.emptyState(), ...parsed } as AppState;
      }
    } catch (e) {
      console.error('Failed to load store from localStorage', e);
    }
    return this.emptyState();
  }

  private emptyState(): AppState {
    return {
      businesses: [], outlets: [], users: [], employees: [], products: [],
      inventoryRecords: [], stockMovements: [], stockTransfers: [], customers: [],
      customerProductStats: [], orders: [], orderItems: [], invoices: [], invoiceLineItems: [],
      sales: [], payments: [], expenses: [], ledgerEntries: [], attendanceRecords: [],
      payrollRuns: [], payrollLineItems: [], forecastEntries: [], churnScores: [],
      notifications: [], notificationRules: [], messageLogs: [], chatbotQueryLogs: [], auditEvents: [],
      followUps: [], leaveRecords: [],
    };
  }

  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.state);
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (e) {
      console.error('Failed to save store to localStorage', e);
    }
  }

  getState(): AppState {
    return this.state;
  }

  setState(newState: Partial<AppState>) {
    this.state = { ...this.state, ...newState };
    // Persist to localStorage
    this.saveToStorage();
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Helper to append a single record to a table
  insert<K extends keyof AppState>(table: K, record: AppState[K][0]) {
    this.setState({
      [table]: [...this.state[table], record]
    } as any);
  }

  // Helper to update a single record by id
  // Update a single record by id
  update<K extends keyof AppState>(table: K, id: string, updates: Partial<AppState[K][0]>) {
    const list = this.state[table] as any[];
    this.setState({
      [table]: list.map(item => item.id === id ? { ...item, ...updates } : item),
    } as any);
  }

  // ---------- Notification API ----------
  addNotification(notification: Types.Notification) {
    this.insert('notifications', notification);
  }

  markNotificationRead(id: string) {
    this.update('notifications', id, { read: true });
  }

  markAllNotificationsRead() {
    const updated = this.state.notifications.map((n) => ({ ...n, read: true }));
    this.setState({ notifications: updated });
  }

  toggleRuleEnabled(ruleId: string) {
    const list = this.state.notificationRules as Types.NotificationRule[];
    this.setState({
      notificationRules: list.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
    });
  }

  addRule(rule: Types.NotificationRule) {
    this.insert('notificationRules', rule);
  }

  deleteRule(ruleId: string) {
    const list = this.state.notificationRules as Types.NotificationRule[];
    this.setState({
      notificationRules: list.filter((r) => r.id !== ruleId),
    });
  }

  // ---------- Message Log API ----------
  addMessageLog(log: Types.MessageLog) {
    this.insert('messageLogs', log);
  }

  updateMessageLogStatus(id: string, status: Types.MessageStatus) {
    this.update('messageLogs', id, { status });
  }
}

export const store = new Store();

// Optional hook for React components to subscribe to store changes
import { useSyncExternalStore } from 'react';

export function useStore(): AppState;
export function useStore<T>(selector: (state: AppState) => T): T;
export function useStore<T>(selector?: (state: AppState) => T) {
  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector ? selector(store.getState()) : store.getState()
  );
}
