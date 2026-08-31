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
}

type Listener = () => void;

class Store {
  private state: AppState = {
    businesses: [], outlets: [], users: [], employees: [], products: [], 
    inventoryRecords: [], stockMovements: [], stockTransfers: [], customers: [], 
    customerProductStats: [], orders: [], orderItems: [], invoices: [], invoiceLineItems: [], 
    sales: [], payments: [], expenses: [], ledgerEntries: [], attendanceRecords: [], 
    payrollRuns: [], payrollLineItems: [], forecastEntries: [], churnScores: [], 
    notifications: [], notificationRules: [], messageLogs: [], chatbotQueryLogs: [], auditEvents: [],
    followUps: []
  };
  
  private listeners: Set<Listener> = new Set();

  getState(): AppState {
    return this.state;
  }

  setState(newState: Partial<AppState>) {
    this.state = { ...this.state, ...newState };
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
  update<K extends keyof AppState>(table: K, id: string, updates: Partial<AppState[K][0]>) {
    const list = this.state[table] as any[];
    this.setState({
      [table]: list.map(item => item.id === id ? { ...item, ...updates } : item)
    } as any);
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
