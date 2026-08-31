export type Role = 'owner' | 'manager' | 'cashier' | 'accountant';

export interface Business {
  id: string;
  name: string;
  taxId?: string;
  currency: string;
  createdAt: string;
}

export interface Outlet {
  id: string;
  businessId: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface User {
  id: string;
  businessId: string;
  outletId?: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Employee {
  id: string;
  userId?: string;
  businessId: string;
  name: string;
  hourlyRate: number;
  status: 'active' | 'inactive';
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  category: string;
  createdAt: string;
}

export interface InventoryRecord {
  id: string;
  productId: string;
  outletId: string;
  quantity: number;
  reorderLevel: number;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  outletId: string;
  quantityChange: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'sale';
  referenceId?: string;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  productId: string;
  fromOutletId: string;
  toOutletId: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  totalSpent: number;
  outstandingBalance?: number;
  lastVisit?: string;
  createdAt: string;
}

export interface CustomerProductStat {
  id: string;
  customerId: string;
  productId: string;
  purchaseCount: number;
  lastPurchased: string;
}

export interface Order {
  id: string;
  outletId: string;
  customerId?: string;
  cashierId: string;
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'completed' | 'cancelled' | 'returned';
  totalAmount: number;
  history?: { status: string; timestamp: string }[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  customerId?: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue' | 'cancelled' | 'partially_paid';
  dueDate?: string;
  createdAt: string;
  amountPaid?: number;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Sale {
  id: string;
  orderId: string;
  outletId: string;
  customerId?: string;
  total: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer';
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
}

export interface Expense {
  id: string;
  outletId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  recordedBy: string;
}

export interface LedgerEntry {
  id: string;
  businessId: string;
  amount: number;
  type: 'credit' | 'debit';
  sourceType: 'sale' | 'expense' | 'payroll' | 'payment';
  referenceId: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  hoursWorked: number;
  status: 'present' | 'absent' | 'leave';
}

export interface PayrollRun {
  id: string;
  businessId: string;
  month: string;
  totalAmount: number;
  status: 'draft' | 'processed' | 'paid';
  createdAt: string;
}

export interface PayrollLineItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  hoursWorked: number;
  amount: number;
  deductions: number;
  netPay: number;
}

export interface ForecastEntry {
  id: string;
  productId: string;
  outletId: string;
  predictedDate: string;
  predictedDemand: number;
  confidenceScore: number;
}

export interface ChurnScore {
  id: string;
  customerId: string;
  score: number; // 0 to 100
  riskLevel: 'low' | 'medium' | 'high';
  calculatedAt: string;
}

export interface Notification {
  id: string;
  businessId: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'warning';
  read: boolean;
  createdAt: string;
}

export interface NotificationRule {
  id: string;
  businessId: string;
  triggerEvent: string; // e.g., 'stock.belowThreshold'
  action: 'in_app' | 'sms' | 'email';
  enabled: boolean;
}

export interface MessageLog {
  id: string;
  recipient: string; // phone or email
  content: string;
  status: 'sent' | 'failed';
  sentAt: string;
}

export interface ChatbotQueryLog {
  id: string;
  userId: string;
  query: string;
  response: string;
  intent: string;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  businessId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  details: string; // JSON stringified metadata
  timestamp: string;
}
