import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  CreditCard,
  FileText,
  AlertTriangle,
  Search,
  Users
} from 'lucide-react';
import { useStore } from '../../services/store';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { formatINR } from '../../utils/format';
import { mockApi } from '../../services/mockApi';
import { PayrollStepper } from './components/PayrollStepper';
import { PayslipModal } from './components/PayslipModal';
import type { PayrollLineItem } from '../../types';
import styles from './styles/payroll.module.css';

interface PayrollRunDetailProps {
  runId: string;
  onBack: () => void;
}

export const PayrollRunDetail: React.FC<PayrollRunDetailProps> = ({ runId, onBack }) => {
  const { currentUser } = useAuth();
  const payrollRuns = useStore(state => state.payrollRuns);
  const payrollLineItems = useStore(state => state.payrollLineItems);
  const employees = useStore(state => state.employees);
  const outlets = useStore(state => state.outlets);

  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState('all');
  const [selectedPayslipItem, setSelectedPayslipItem] = useState<PayrollLineItem | undefined>(undefined);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Role permissions
  const isAuthorized = currentUser?.role === 'owner' || currentUser?.role === 'accountant';

  const run = payrollRuns.find(r => r.id === runId);

  const lineItems = useMemo(() => {
    return payrollLineItems.filter(item => item.payrollRunId === runId);
  }, [payrollLineItems, runId]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  const outletMap = useMemo(() => {
    return new Map(outlets.map(o => [o.id, o]));
  }, [outlets]);

  // Format month name
  const [y, m] = (run?.month || '2026-09').split('-');
  const monthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const formattedMonth = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Filter line items
  const filteredLineItems = useMemo(() => {
    return lineItems.filter(item => {
      const emp = employeeMap.get(item.employeeId);
      if (!emp) return false;
      if (outletFilter !== 'all' && emp.outletId !== outletFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchRole = emp.role.toLowerCase().includes(q);
        if (!matchName && !matchRole) return false;
      }
      return true;
    });
  }, [lineItems, employeeMap, outletFilter, searchQuery]);

  // Warning metrics
  const incompleteCount = lineItems.filter(i => i.isAttendanceIncomplete).length;
  const proRatedCount = lineItems.filter(i => i.isProRated).length;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCalculate = async () => {
    if (!run) return;
    setProcessing(true);
    try {
      await mockApi.calculatePayrollRun(run.id);
      showToast('Payroll calculations updated successfully from attendance records!');
    } catch (err: any) {
      showToast(err.message || 'Failed to calculate payroll', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!run) return;
    if (!isAuthorized) {
      showToast('Only Owner and Accountant roles can approve payroll', 'error');
      return;
    }
    setProcessing(true);
    try {
      await mockApi.approvePayrollRun(run.id, currentUser?.id || 'u-1');
      showToast('Payroll cycle successfully Approved! Ready for payment disbursement.');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve payroll', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!run) return;
    if (!isAuthorized) {
      showToast('Only Owner and Accountant roles can disburse payroll', 'error');
      return;
    }
    setProcessing(true);
    try {
      await mockApi.markPayrollRunPaid(run.id, currentUser?.id || 'u-1');
      showToast(`Payroll for ${formattedMonth} marked as Paid! Debit posted to Finance Ledger.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to mark payroll as paid', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!run) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Payroll Run Not Found</h2>
          <button
            onClick={onBack}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            Back to Payroll Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to All Payroll Runs
        </button>
      </div>

      {/* 4-Stage Stepper Progression */}
      <PayrollStepper run={run} />

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CheckCircle size={18} />
          {toast.message}
        </div>
      )}

      {/* Main Run Details Card */}
      <div className={styles.runDetailsCard}>
        {/* Header Summary */}
        <div className={styles.runHeaderBar}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                {formattedMonth} Payroll
              </h2>
              <span
                className={`${styles.statusChip} ${
                  run.status === 'draft'
                    ? styles.statusDraft
                    : run.status === 'calculated'
                    ? styles.statusCalculated
                    : run.status === 'approved'
                    ? styles.statusApproved
                    : styles.statusPaid
                }`}
              >
                {run.status}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-muted-text)' }}>
              Cycle ID: <code style={{ color: 'var(--color-text)' }}>{run.id}</code> • Standard monthly payroll run
            </p>
          </div>

          <div className={styles.runMetricsRow}>
            <div className={styles.runMetricBlock}>
              <span className={styles.runMetricLabel}>Staff Count</span>
              <span className={styles.runMetricValue}>{run.totalEmployees} Members</span>
            </div>

            <div className={styles.runMetricBlock}>
              <span className={styles.runMetricLabel}>Total Gross Pay</span>
              <span className={styles.runMetricValue}>{formatINR(run.totalGross)}</span>
            </div>

            <div className={styles.runMetricBlock}>
              <span className={styles.runMetricLabel}>Total Deductions</span>
              <span className={styles.runMetricValue} style={{ color: '#dc2626' }}>
                -{formatINR(run.totalDeductions)}
              </span>
            </div>

            <div className={styles.runMetricBlock}>
              <span className={styles.runMetricLabel}>Net Disbursement</span>
              <span className={styles.runMetricValue} style={{ color: '#059669', fontSize: 22 }}>
                {formatINR(run.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Actions Toolbar */}
        <div className={styles.actionBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 240 }}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search staff in run..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: 12,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)'
                }}
              />
            </div>

            <select
              value={outletFilter}
              onChange={e => setOutletFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)'
              }}
            >
              <option value="all">All Outlets</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 1. Calculate Action (Always available if not yet paid to refresh attendance) */}
            {run.status !== 'paid' && (
              <button
                onClick={handleCalculate}
                disabled={processing}
                style={{
                  padding: '8px 14px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <Calculator size={15} />
                {run.status === 'draft' ? 'Calculate Run' : 'Recompute Attendance'}
              </button>
            )}

            {/* 2. Approve Action (Owner/Accountant only) */}
            {isAuthorized && run.status === 'calculated' && (
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#7c3aed',
                  border: '1px solid #7c3aed',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <CheckCircle size={15} />
                Approve Payroll
              </button>
            )}

            {/* 3. Mark Paid Action (Owner/Accountant only) */}
            {isAuthorized && run.status === 'approved' && (
              <button
                onClick={handleMarkPaid}
                disabled={processing}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <CreditCard size={16} />
                Mark as Paid & Post to Finance
              </button>
            )}

            {run.status === 'paid' && (
              <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Fully Disbursed & Posted to Ledger ({run.ledgerEntryId})
              </span>
            )}
          </div>
        </div>

        {/* Warning Banners for Incomplete Attendance or Mid-month Joiners */}
        {(incompleteCount > 0 || proRatedCount > 0) && (
          <div style={{ padding: '10px 24px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fef3c7', display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
            {incompleteCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309' }}>
                <AlertTriangle size={15} />
                <span>
                  <strong>{incompleteCount}</strong> staff member(s) have unpunched or incomplete attendance records.
                </span>
              </div>
            )}
            {proRatedCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8' }}>
                <Users size={15} />
                <span>
                  <strong>{proRatedCount}</strong> staff member(s) joined mid-month and their base pay has been accurately pro-rated.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Line Items Table */}
        <div className={styles.tableContainer}>
          <table className={styles.payrollTable}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role & Outlet</th>
                <th>Base CTC</th>
                <th>Gross Earnings</th>
                <th>Attendance Summary</th>
                <th>Deductions (Att + EPF)</th>
                <th>Net Payable</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Payslip</th>
              </tr>
            </thead>
            <tbody>
              {filteredLineItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted-text)' }}>
                    No line items found.
                  </td>
                </tr>
              ) : (
                filteredLineItems.map(item => {
                  const emp = employeeMap.get(item.employeeId);
                  const outlet = emp?.outletId ? outletMap.get(emp.outletId) : undefined;
                  const initials = emp?.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'EM';

                  return (
                    <tr key={item.id}>
                      {/* Employee */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={styles.avatar} style={{ width: 34, height: 34, fontSize: 12 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{emp?.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{emp?.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Outlet */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{emp?.role}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{outlet?.name}</span>
                        </div>
                      </td>

                      {/* Base CTC */}
                      <td>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {formatINR(item.baseSalary)}
                        </div>
                        {item.isProRated && (
                          <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
                            Pro-rated ({emp?.joiningDate})
                          </span>
                        )}
                      </td>

                      {/* Gross Earnings */}
                      <td>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--color-text)' }}>
                          {formatINR(item.grossEarnings)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-muted-text)' }}>
                          Basic: {formatINR(item.baseSalary * 0.5)} • HRA: {formatINR(item.hra)}
                        </div>
                      </td>

                      {/* Attendance Summary */}
                      <td>
                        <div style={{ display: 'flex', gap: 6, fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: '#059669' }}>{item.presentDays}P</span>
                          <span style={{ color: '#d97706' }}>{item.lateDays}L</span>
                          <span style={{ color: '#7c3aed' }}>{item.leaveDays}LV</span>
                          <span style={{ color: '#dc2626' }}>{item.absentDays}A</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-muted-text)', marginTop: 2 }}>
                          {item.hoursWorked} hrs • {item.workingDays}d cycle
                        </div>
                        {item.isAttendanceIncomplete && (
                          <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <AlertTriangle size={10} /> Incomplete
                          </span>
                        )}
                      </td>

                      {/* Deductions */}
                      <td>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#dc2626' }}>
                          -{formatINR(item.totalDeductions)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-muted-text)' }}>
                          Att: -{formatINR(item.attendanceDeduction)} • EPF: -{formatINR(item.statutoryDeductions)}
                        </div>
                      </td>

                      {/* Net Payable */}
                      <td>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 15, color: '#059669' }}>
                          {formatINR(item.netPay)}
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: item.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: item.paymentStatus === 'paid' ? '#059669' : '#d97706'
                          }}
                        >
                          {item.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>

                      {/* Action: Payslip */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedPayslipItem(item)}
                          className={styles.iconBtn}
                          title="Generate & View Payslip"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', fontSize: 12 }}
                        >
                          <FileText size={14} />
                          <span>Payslip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Payslip Modal */}
      {selectedPayslipItem && (
        <PayslipModal
          isOpen={!!selectedPayslipItem}
          onClose={() => setSelectedPayslipItem(undefined)}
          lineItem={selectedPayslipItem}
          run={run}
        />
      )}
    </div>
  );
};
