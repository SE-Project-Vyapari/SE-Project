import type { AppState } from '../../services/store';
import { calculateDateRanges, isDateInInterval } from '../analytics/utils/analyticsHelpers';
import type { DateRangePreset } from '../analytics/types';
import { format } from 'date-fns';

export type ReportId =
  | 'sales'
  | 'inventory'
  | 'pnl'
  | 'customers'
  | 'outstanding'
  | 'attendance'
  | 'payroll'
  | 'tax_gst';

export interface ReportConfig {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  outletId: string; // 'all' or outlet id
  category: string; // 'all' or category name (Inventory)
  employeeId: string; // 'all' or employee id (Attendance)
}

export interface ReportSummaryCard {
  label: string;
  value: string;
}

export interface ReportResult {
  id: ReportId;
  title: string;
  subtitle: string;
  periodLabel: string;
  summaryCards: ReportSummaryCard[];
  columns: string[];
  rows: (string | number)[][];
}

const fmtINR = (val: number, decimals = false) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(val);

function deriveGstRate(categoryRaw?: string): number {
  const category = (categoryRaw || '').toLowerCase();
  if (category.includes('grocery') || category.includes('food')) return 5;
  if (category.includes('electronics') || category.includes('device')) return 18;
  if (category.includes('apparel') || category.includes('clothing')) return 5;
  if (category.includes('stationery')) return 12;
  return 12;
}

export function generateReport(
  reportId: ReportId,
  state: AppState,
  config: ReportConfig
): ReportResult {
  const ranges = calculateDateRanges({
    preset: config.preset,
    startDate: config.startDate,
    endDate: config.endDate,
    outletId: config.outletId,
    categoryId: 'all',
    productId: 'all',
    comparePrior: false,
  });

  const { startDate: start, endDate: end, label: periodLabel } = ranges.current;
  const outletName =
    config.outletId === 'all'
      ? 'All Outlets'
      : state.outlets.find(o => o.id === config.outletId)?.name || config.outletId;

  const matchOutlet = (outletId?: string) =>
    config.outletId === 'all' || !outletId || outletId === config.outletId;

  switch (reportId) {
    case 'sales': {
      // Uses the exact same sales filtering & revenue/COGS logic as SalesAnalyticsTab
      const orderItemsMap = new Map<string, typeof state.orderItems>();
      state.orderItems.forEach(oi => {
        const list = orderItemsMap.get(oi.orderId) || [];
        list.push(oi);
        orderItemsMap.set(oi.orderId, list);
      });
      const productCostMap = new Map(state.products.map(p => [p.id, p.cost || 0]));

      let totalRevenue = 0;
      let totalCost = 0;
      let orderCount = 0;

      const matchingSales = state.sales
        .filter(
          s => isDateInInterval(s.createdAt, start, end) && matchOutlet(s.outletId)
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const rows = matchingSales.map(s => {
        totalRevenue += s.total;
        orderCount += 1;
        const items = orderItemsMap.get(s.orderId) || [];
        let saleCost = 0;
        let qty = 0;
        items.forEach(item => {
          saleCost += (productCostMap.get(item.productId) || 0) * item.quantity;
          qty += item.quantity;
        });
        totalCost += saleCost;

        const outlet = state.outlets.find(o => o.id === s.outletId)?.name || s.outletId;
        const customer = s.customerId
          ? state.customers.find(c => c.id === s.customerId)?.name || s.customerId
          : 'Walk-in Customer';

        return [
          format(new Date(s.createdAt), 'dd MMM yyyy, HH:mm'),
          s.orderId,
          outlet,
          customer,
          qty,
          fmtINR(s.total),
          fmtINR(s.total - saleCost),
        ];
      });

      const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

      return {
        id: 'sales',
        title: 'Sales Report',
        subtitle: `Outlet: ${outletName}`,
        periodLabel,
        summaryCards: [
          { label: 'Total Revenue', value: fmtINR(totalRevenue) },
          { label: 'Orders', value: String(orderCount) },
          { label: 'Avg Order Value', value: fmtINR(aov) },
          { label: 'Gross Profit', value: fmtINR(totalRevenue - totalCost) },
        ],
        columns: ['Date', 'Order ID', 'Outlet', 'Customer', 'Items', 'Revenue', 'Gross Profit'],
        rows,
      };
    }

    case 'inventory': {
      const targetOutletId =
        config.outletId === 'all' ? undefined : config.outletId;

      let totalUnits = 0;
      let totalCostValue = 0;
      let lowStockCount = 0;

      const filteredProducts = state.products.filter(
        p => config.category === 'all' || p.category === config.category
      );

      const rows = filteredProducts.map(p => {
        const recs = state.inventoryRecords.filter(
          r => r.productId === p.id && (!targetOutletId || r.outletId === targetOutletId)
        );
        const qty = recs.reduce((sum, r) => sum + r.quantity, 0);
        const reorder = recs.reduce((sum, r) => sum + r.reorderLevel, 0);
        const status =
          qty === 0 ? 'Out of Stock' : qty <= reorder ? 'Low Stock' : 'Healthy';

        totalUnits += qty;
        totalCostValue += qty * p.cost;
        if (qty <= reorder) lowStockCount += 1;

        return [
          p.sku,
          p.name,
          p.category,
          p.barcode || '—',
          qty,
          reorder,
          status,
          fmtINR(p.cost),
          fmtINR(p.price),
          fmtINR(qty * p.cost),
        ];
      });

      return {
        id: 'inventory',
        title: 'Inventory Valuation & Stock Report',
        subtitle: `Outlet: ${outletName} • Category: ${config.category === 'all' ? 'All' : config.category}`,
        periodLabel: 'Current Snapshot',
        summaryCards: [
          { label: 'SKUs Listed', value: String(filteredProducts.length) },
          { label: 'Total Units', value: String(totalUnits) },
          { label: 'Stock Value (Cost)', value: fmtINR(totalCostValue) },
          { label: 'Low / Out of Stock', value: String(lowStockCount) },
        ],
        columns: [
          'SKU',
          'Product',
          'Category',
          'Barcode',
          'Qty',
          'Reorder Level',
          'Status',
          'Cost',
          'Price',
          'Stock Value',
        ],
        rows,
      };
    }

    case 'pnl': {
      // Matches FinancialAnalyticsTab calculations
      let revenue = 0;
      state.sales.forEach(s => {
        if (isDateInInterval(s.createdAt, start, end) && matchOutlet(s.outletId)) {
          revenue += s.total;
        }
      });

      const expByCategory = new Map<string, number>();
      let totalExpenses = 0;

      state.expenses.forEach(e => {
        const d = e.date || e.createdAt || '';
        if (isDateInInterval(d, start, end) && matchOutlet(e.outletId)) {
          const cat = e.category || 'Miscellaneous';
          expByCategory.set(cat, (expByCategory.get(cat) || 0) + e.amount);
          totalExpenses += e.amount;
        }
      });

      state.payrollRuns.forEach(pr => {
        if (
          pr.status === 'paid' &&
          pr.calculatedAt &&
          isDateInInterval(pr.calculatedAt, start, end)
        ) {
          expByCategory.set('Salaries', (expByCategory.get('Salaries') || 0) + pr.totalAmount);
          totalExpenses += pr.totalAmount;
        }
      });

      const netProfit = revenue - totalExpenses;
      const margin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';

      const rows: (string | number)[][] = [
        ['Income', 'Sales Revenue', fmtINR(revenue), '100.0%'],
        ...Array.from(expByCategory.entries()).map(([cat, amt]) => [
          'Expense',
          cat,
          fmtINR(amt),
          revenue > 0 ? `${((amt / revenue) * 100).toFixed(1)}%` : '0.0%',
        ]),
      ];

      return {
        id: 'pnl',
        title: 'Profit & Loss Statement',
        subtitle: `Outlet: ${outletName}`,
        periodLabel,
        summaryCards: [
          { label: 'Total Revenue', value: fmtINR(revenue) },
          { label: 'Total Expenses', value: fmtINR(totalExpenses) },
          { label: 'Net Profit', value: fmtINR(netProfit) },
          { label: 'Net Margin', value: `${margin}%` },
        ],
        columns: ['Type', 'Category / Line Item', 'Amount', '% of Revenue'],
        rows,
      };
    }

    case 'customers': {
      const totalSpent = state.customers.reduce((s, c) => s + c.totalSpent, 0);
      const totalOutstanding = state.customers.reduce(
        (s, c) => s + (c.outstandingBalance || 0),
        0
      );
      const optedInCount = state.customers.filter(
        c => c.optedIn !== false && c.optInForMessages !== false
      ).length;

      const rows = state.customers.map(c => {
        const churn = state.churnScores.find(cs => cs.customerId === c.id);
        const optedIn = c.optedIn !== false && c.optInForMessages !== false;
        return [
          c.name,
          c.type || 'retail',
          c.phone || c.email || '—',
          optedIn ? 'Opted In' : 'Opted Out',
          fmtINR(c.totalSpent),
          fmtINR(c.outstandingBalance || 0),
          churn ? churn.riskLevel.toUpperCase() : 'LOW',
        ];
      });

      return {
        id: 'customers',
        title: 'Customer Directory & CRM Report',
        subtitle: 'All Business Customers',
        periodLabel: 'All Time',
        summaryCards: [
          { label: 'Total Customers', value: String(state.customers.length) },
          { label: 'Opted-In for Messaging', value: String(optedInCount) },
          { label: 'Cumulative Spend', value: fmtINR(totalSpent) },
          { label: 'Total Receivables', value: fmtINR(totalOutstanding) },
        ],
        columns: [
          'Customer',
          'Segment',
          'Contact',
          'Messaging Opt-In',
          'Total Spent',
          'Outstanding',
          'Churn Risk',
        ],
        rows,
      };
    }

    case 'outstanding': {
      const nowMs = Date.now();
      const pendingInvoices = state.invoices.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'cancelled') return false;
        const order = state.orders.find(o => o.id === inv.orderId);
        if (!matchOutlet(order?.outletId)) return false;
        return true;
      });

      let totalDue = 0;
      let overdueCount = 0;

      const rows = pendingInvoices.map(inv => {
        const paid = inv.amountPaid || 0;
        const balance = Math.max(0, inv.amount - paid);
        totalDue += balance;

        const dueMs = inv.dueDate ? new Date(inv.dueDate).getTime() : nowMs;
        const daysOverdue = Math.max(0, Math.floor((nowMs - dueMs) / 86_400_000));
        if (daysOverdue > 0 || inv.status === 'overdue') overdueCount += 1;

        const cust = inv.customerId
          ? state.customers.find(c => c.id === inv.customerId)?.name || inv.customerId
          : 'Walk-in';

        return [
          inv.invoiceNumber,
          cust,
          inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—',
          daysOverdue > 0 ? `${daysOverdue} days` : 'On Time',
          inv.status.replace('_', ' ').toUpperCase(),
          fmtINR(inv.amount),
          fmtINR(paid),
          fmtINR(balance),
        ];
      });

      return {
        id: 'outstanding',
        title: 'Outstanding Payments & Receivables',
        subtitle: `Outlet: ${outletName}`,
        periodLabel: 'As of Today',
        summaryCards: [
          { label: 'Open Invoices', value: String(pendingInvoices.length) },
          { label: 'Overdue Invoices', value: String(overdueCount) },
          { label: 'Total Balance Due', value: fmtINR(totalDue) },
        ],
        columns: [
          'Invoice #',
          'Customer',
          'Due Date',
          'Overdue',
          'Status',
          'Invoice Amount',
          'Paid',
          'Balance Due',
        ],
        rows,
      };
    }

    case 'attendance': {
      const records = state.attendanceRecords
        .filter(rec => {
          if (!isDateInInterval(rec.date, start, end)) return false;
          if (config.employeeId !== 'all' && rec.employeeId !== config.employeeId) return false;
          const emp = state.employees.find(e => e.id === rec.employeeId);
          if (!matchOutlet(emp?.outletId)) return false;
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      let present = 0;
      let late = 0;
      let absent = 0;
      let totalHours = 0;

      const rows = records.map(rec => {
        if (rec.status === 'present') present += 1;
        if (rec.status === 'late') late += 1;
        if (rec.status === 'absent') absent += 1;
        totalHours += rec.hoursWorked || 0;

        const emp = state.employees.find(e => e.id === rec.employeeId);
        return [
          rec.date,
          emp?.name || rec.employeeId,
          emp?.department || '—',
          rec.status.toUpperCase(),
          rec.checkIn || '—',
          rec.checkOut || '—',
          `${(rec.hoursWorked || 0).toFixed(1)} hrs`,
        ];
      });

      return {
        id: 'attendance',
        title: 'Employee Attendance Report',
        subtitle: `Outlet: ${outletName}`,
        periodLabel,
        summaryCards: [
          { label: 'Records', value: String(records.length) },
          { label: 'Present / Late', value: `${present} / ${late}` },
          { label: 'Absent', value: String(absent) },
          { label: 'Total Hours', value: `${Math.round(totalHours)} hrs` },
        ],
        columns: ['Date', 'Employee', 'Department', 'Status', 'Check In', 'Check Out', 'Hours'],
        rows,
      };
    }

    case 'payroll': {
      const runs = [...state.payrollRuns].sort((a, b) => b.month.localeCompare(a.month));
      let totalDisbursed = 0;
      let totalGross = 0;
      let totalDeductions = 0;

      const rows = runs.map(run => {
        totalDisbursed += run.totalAmount;
        totalGross += run.totalGross;
        totalDeductions += run.totalDeductions;
        return [
          run.month,
          run.totalEmployees,
          fmtINR(run.totalGross),
          fmtINR(run.totalDeductions),
          fmtINR(run.totalAmount),
          run.status.toUpperCase(),
          run.paidAt ? format(new Date(run.paidAt), 'dd MMM yyyy') : 'Pending',
        ];
      });

      return {
        id: 'payroll',
        title: 'Payroll Summary Report',
        subtitle: 'All Payroll Runs',
        periodLabel: 'All Recorded Months',
        summaryCards: [
          { label: 'Payroll Runs', value: String(runs.length) },
          { label: 'Total Gross', value: fmtINR(totalGross) },
          { label: 'Total Deductions', value: fmtINR(totalDeductions) },
          { label: 'Total Net Payable', value: fmtINR(totalDisbursed) },
        ],
        columns: [
          'Month',
          'Employees',
          'Gross Earnings',
          'Deductions',
          'Net Payable',
          'Status',
          'Paid Date',
        ],
        rows,
      };
    }

    case 'tax_gst': {
      // Aggregate GST collected across non-cancelled Invoices in selected period & outlet
      const orderItemsMap = new Map<string, typeof state.orderItems>();
      state.orderItems.forEach(oi => {
        const list = orderItemsMap.get(oi.orderId) || [];
        list.push(oi);
        orderItemsMap.set(oi.orderId, list);
      });
      const productMap = new Map(state.products.map(p => [p.id, p]));

      const matchingInvoices = state.invoices.filter(inv => {
        if (inv.status === 'cancelled') return false;
        if (!isDateInInterval(inv.createdAt, start, end)) return false;
        const order = state.orders.find(o => o.id === inv.orderId);
        if (!matchOutlet(order?.outletId)) return false;
        return true;
      });

      const gstBuckets = new Map<
        number,
        { rate: number; invoiceIds: Set<string>; taxable: number; cgst: number; sgst: number; totalGst: number; gross: number }
      >();

      let grandTaxable = 0;
      let grandGst = 0;

      matchingInvoices.forEach(inv => {
        const items = orderItemsMap.get(inv.orderId) || [];
        items.forEach(item => {
          const prod = productMap.get(item.productId);
          const rate = deriveGstRate(prod?.category);
          const inclusive = item.subtotal;
          const taxable = inclusive / (1 + rate / 100);
          const gst = inclusive - taxable;

          grandTaxable += taxable;
          grandGst += gst;

          const existing = gstBuckets.get(rate) || {
            rate,
            invoiceIds: new Set<string>(),
            taxable: 0,
            cgst: 0,
            sgst: 0,
            totalGst: 0,
            gross: 0,
          };
          existing.invoiceIds.add(inv.id);
          existing.taxable += taxable;
          existing.cgst += gst / 2;
          existing.sgst += gst / 2;
          existing.totalGst += gst;
          existing.gross += inclusive;
          gstBuckets.set(rate, existing);
        });
      });

      const rows = Array.from(gstBuckets.values())
        .sort((a, b) => a.rate - b.rate)
        .map(b => [
          `${b.rate}% GST (${b.rate / 2}% CGST + ${b.rate / 2}% SGST)`,
          b.invoiceIds.size,
          fmtINR(b.taxable, true),
          fmtINR(b.cgst, true),
          fmtINR(b.sgst, true),
          fmtINR(b.totalGst, true),
          fmtINR(b.gross, true),
        ]);

      return {
        id: 'tax_gst',
        title: 'Tax / GST Summary Report',
        subtitle: `Outlet: ${outletName} • GSTIN: ${state.businesses[0]?.taxId || '29AAAAA1111A1Z5'}`,
        periodLabel,
        summaryCards: [
          { label: 'Taxable Invoices', value: String(matchingInvoices.length) },
          { label: 'Taxable Value', value: fmtINR(grandTaxable, true) },
          { label: 'CGST + SGST Collected', value: fmtINR(grandGst, true) },
          { label: 'Gross Invoice Value', value: fmtINR(grandTaxable + grandGst, true) },
        ],
        columns: [
          'GST Slab',
          'Invoices',
          'Taxable Value',
          'CGST',
          'SGST',
          'Total GST',
          'Gross Total',
        ],
        rows,
      };
    }
  }
}

export function exportReportToCsv(report: ReportResult) {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Always emits valid header row even when rows.length === 0
  const lines = [
    report.columns.map(escapeCell).join(','),
    ...report.rows.map(row => row.map(escapeCell).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.id}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
