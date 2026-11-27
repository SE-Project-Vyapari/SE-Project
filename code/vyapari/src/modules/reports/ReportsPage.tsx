import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../services/store';
import { Button } from '../../components/ui/Button';
import {
  generateReport,
  exportReportToCsv,
  type ReportId,
  type ReportConfig,
} from './reportBuilders';
import type { DateRangePreset } from '../analytics/types';
import styles from './styles/reports.module.css';
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Users,
  AlertCircle,
  CalendarCheck,
  CreditCard,
  Receipt,
  Download,
  Printer,
  FileBarChart,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface CatalogItem {
  id: ReportId;
  title: string;
  description: string;
  icon: React.ReactNode;
  usesDateRange: boolean;
  usesOutlet: boolean;
}

const REPORT_CATALOG: CatalogItem[] = [
  {
    id: 'sales',
    title: 'Sales Report',
    description: 'Order revenue, item counts, AOV, and gross profit matching Analytics totals.',
    icon: <ShoppingBag size={20} color="var(--color-primary)" />,
    usesDateRange: true,
    usesOutlet: true,
  },
  {
    id: 'inventory',
    title: 'Inventory Report',
    description: 'Stock quantities, reorder levels, stock health status, and cost valuation.',
    icon: <Package size={20} color="var(--color-primary)" />,
    usesDateRange: false,
    usesOutlet: true,
  },
  {
    id: 'pnl',
    title: 'Profit & Loss',
    description: 'Revenue vs. operating expenses and paid payroll with net margin.',
    icon: <TrendingUp size={20} color="var(--color-primary)" />,
    usesDateRange: true,
    usesOutlet: true,
  },
  {
    id: 'customers',
    title: 'Customer Report',
    description: 'Customer directory, segment, messaging opt-in status, spend, and churn risk.',
    icon: <Users size={20} color="var(--color-primary)" />,
    usesDateRange: false,
    usesOutlet: false,
  },
  {
    id: 'outstanding',
    title: 'Outstanding Payments',
    description: 'Unpaid, partially paid, and overdue invoices with aging and balance due.',
    icon: <AlertCircle size={20} color="var(--color-primary)" />,
    usesDateRange: false,
    usesOutlet: true,
  },
  {
    id: 'attendance',
    title: 'Employee Attendance',
    description: 'Daily check-ins, late/absent logs, and total hours worked by employee.',
    icon: <CalendarCheck size={20} color="var(--color-primary)" />,
    usesDateRange: true,
    usesOutlet: true,
  },
  {
    id: 'payroll',
    title: 'Payroll Report',
    description: 'Monthly payroll runs, gross earnings, deductions, and net disbursements.',
    icon: <CreditCard size={20} color="var(--color-primary)" />,
    usesDateRange: false,
    usesOutlet: false,
  },
  {
    id: 'tax_gst',
    title: 'Tax / GST Summary',
    description: 'GST collected across invoice line items grouped by 5%, 12%, and 18% slabs.',
    icon: <Receipt size={20} color="var(--color-primary)" />,
    usesDateRange: true,
    usesOutlet: true,
  },
];

export const ReportsPage = () => {
  const state = useStore();
  const reportRef = useRef<HTMLDivElement>(null);
  const [selectedReportId, setSelectedReportId] = useState<ReportId>('sales');
  const [config, setConfig] = useState<ReportConfig>({
    preset: '30d',
    startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    outletId: 'all',
    category: 'all',
    employeeId: 'all',
  });

  const categories = useMemo(
    () => Array.from(new Set(state.products.map(p => p.category))),
    [state.products]
  );

  const selectedMeta = REPORT_CATALOG.find(r => r.id === selectedReportId)!;

  const report = useMemo(
    () => generateReport(selectedReportId, state, config),
    [selectedReportId, state, config]
  );

  const handlePrint = () => {
    const el = reportRef.current;
    if (!el) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!doctype html><html><head><title>${report.title}</title><style>
      body { font-family: Inter, system-ui, sans-serif; color: #1f2937; margin: 24px; background: #fff; }
      h2 { margin: 0 0 4px 0; font-size: 20px; }
      [class*="summaryGrid"] { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0 20px 0; }
      [class*="summaryCard"] { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
      table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
      th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
      tr { page-break-inside: avoid; }
    </style></head><body>${el.innerHTML}</body></html>`);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }, 100);
  };

  return (
    <div className={styles.reportsContainer}>
      {/* Page Header */}
      <div
        className="noPrint"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: 24 }}>Reports Center</h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
            Generate, filter, export (CSV), and print operational &amp; financial reports
          </p>
        </div>
      </div>

      {/* Report Catalog Grid */}
      <div className={`${styles.catalogGrid} noPrint`}>
        {REPORT_CATALOG.map(item => {
          const active = item.id === selectedReportId;
          return (
            <div
              key={item.id}
              className={`${styles.reportCard} ${active ? styles.reportCardActive : ''}`}
              onClick={() => setSelectedReportId(item.id)}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: 'rgba(194, 65, 12, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{item.title}</h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--color-muted-text)',
                    lineHeight: 1.45,
                  }}
                >
                  {item.description}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSelectedReportId(item.id);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-background)',
                    color: active ? 'white' : 'var(--color-text)',
                    border: active ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  {active ? 'Selected' : 'Generate'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Panel */}
      <div className={`${styles.configPanel} noPrint`}>
        {selectedMeta.usesDateRange && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Date Range</label>
            <select
              value={config.preset}
              onChange={e =>
                setConfig(prev => ({ ...prev, preset: e.target.value as DateRangePreset }))
              }
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                fontSize: 13,
              }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        )}

        {selectedMeta.usesDateRange && config.preset === 'custom' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Start Date</label>
              <input
                type="date"
                value={config.startDate}
                onChange={e => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>End Date</label>
              <input
                type="date"
                value={config.endDate}
                onChange={e => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  fontSize: 13,
                }}
              />
            </div>
          </>
        )}

        {selectedMeta.usesOutlet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Outlet</label>
            <select
              value={config.outletId}
              onChange={e => setConfig(prev => ({ ...prev, outletId: e.target.value }))}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                fontSize: 13,
              }}
            >
              <option value="all">All Outlets</option>
              {state.outlets.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedReportId === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Category</label>
            <select
              value={config.category}
              onChange={e => setConfig(prev => ({ ...prev, category: e.target.value }))}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                fontSize: 13,
              }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedReportId === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Employee</label>
            <select
              value={config.employeeId}
              onChange={e => setConfig(prev => ({ ...prev, employeeId: e.target.value }))}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                fontSize: 13,
              }}
            >
              <option value="all">All Employees</option>
              {state.employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Button
            type="button"
            onClick={() => exportReportToCsv(report)}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <Download size={15} style={{ marginRight: 6 }} /> Export CSV
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Printer size={15} style={{ marginRight: 6 }} /> Print
          </Button>
        </div>
      </div>

      {/* Generated Report Output (Print-Ready Paper) */}
      <div ref={reportRef} className={styles.reportPaper}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileBarChart size={20} color="var(--color-primary)" />
              <h2 style={{ margin: 0, fontSize: 20 }}>{report.title}</h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>
              {report.subtitle} • Period: {report.periodLabel}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--color-muted-text)' }}>
            <div>{state.businesses[0]?.name || 'Vyapari Superstore'}</div>
            <div>Generated: {format(new Date(), 'dd MMM yyyy, h:mm a')}</div>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className={styles.summaryGrid}>
          {report.summaryCards.map(card => (
            <div key={card.label} className={styles.summaryCard}>
              <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginBottom: 4 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Report Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {report.columns.map(col => (
                  <th key={col} style={{ padding: '12px 14px' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={report.columns.length}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--color-muted-text)',
                      fontSize: 14,
                    }}
                  >
                    No records found for the selected filters and date range. You can still export
                    an empty headered CSV or adjust the filters above.
                  </td>
                </tr>
              ) : (
                report.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: '11px 14px', fontSize: 13 }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
