import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Calendar,
  PlusCircle,
  Users,
  Clock,
  ArrowRight,
  History
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatINR } from '../../utils/format';
import { PayrollRunDetail } from './PayrollRunDetail';
import { NewPayrollRunModal } from './components/NewPayrollRunModal';
import styles from './styles/payroll.module.css';

export const PayrollPage: React.FC = () => {
  const payrollRuns = useStore(state => state.payrollRuns);
  const employees = useStore(state => state.employees);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [newRunModalOpen, setNewRunModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorted runs (newest month first)
  const sortedRuns = useMemo(() => {
    return [...payrollRuns].sort((a, b) => b.month.localeCompare(a.month));
  }, [payrollRuns]);

  // If there is an active/current run or selected run
  const activeRun = sortedRuns.find(r => r.status !== 'paid') || sortedRuns[0];

  // Filtered runs for history list
  const filteredRuns = useMemo(() => {
    return sortedRuns.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [sortedRuns, statusFilter]);

  // Overall KPI Metrics
  const kpiData = useMemo(() => {
    const totalRuns = payrollRuns.length;
    const paidRuns = payrollRuns.filter(r => r.status === 'paid');
    const totalDisbursedHistorical = paidRuns.reduce((sum, r) => sum + r.totalAmount, 0);
    const activeStaff = employees.filter(e => e.status === 'active').length;
    const pendingCount = payrollRuns.filter(r => r.status === 'draft' || r.status === 'calculated').length;

    return {
      totalRuns,
      paidRunsCount: paidRuns.length,
      totalDisbursedHistorical,
      activeStaff,
      pendingCount
    };
  }, [payrollRuns, employees]);

  if (selectedRunId) {
    return <PayrollRunDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Payroll Management & Disbursements</h1>
          <p className={styles.subtitle}>
            Compute monthly salaries from attendance compliance, approve deductions, generate payslips, and disburse bank payments.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={() => setNewRunModalOpen(true)}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <PlusCircle size={16} /> Start New Payroll Run
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)' }}>
            <Calendar size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Current Active Cycle</span>
            <span className={styles.kpiValue}>
              {activeRun ? activeRun.month : 'None'}
            </span>
            <span className={styles.kpiSub}>
              Status: <strong style={{ textTransform: 'uppercase' }}>{activeRun?.status || 'N/A'}</strong>
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <CreditCard size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Historical Disbursed</span>
            <span className={styles.kpiValue}>{formatINR(kpiData.totalDisbursedHistorical)}</span>
            <span className={styles.kpiSub}>Across {kpiData.paidRunsCount} completed monthly runs</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <Users size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Enrolled Staff</span>
            <span className={styles.kpiValue}>{kpiData.activeStaff}</span>
            <span className={styles.kpiSub}>Active employees under payroll</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: kpiData.pendingCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: kpiData.pendingCount > 0 ? '#d97706' : '#059669' }}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Pending Actions</span>
            <span className={styles.kpiValue}>{kpiData.pendingCount}</span>
            <span className={styles.kpiSub}>{kpiData.pendingCount > 0 ? 'Runs awaiting calculate / approval' : 'All cycles up to date'}</span>
          </div>
        </div>
      </div>

      {/* Featured Current Run Card (if any pending/active) */}
      {activeRun && (
        <div className={styles.runDetailsCard} style={{ border: '2px solid var(--color-primary)' }}>
          <div className={styles.runHeaderBar} style={{ backgroundColor: 'rgba(99, 102, 241, 0.04)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--color-primary)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                  Active Payroll Cycle
                </span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {new Date(parseInt(activeRun.month.split('-')[0]), parseInt(activeRun.month.split('-')[1]) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h3>
                <span
                  className={`${styles.statusChip} ${
                    activeRun.status === 'draft'
                      ? styles.statusDraft
                      : activeRun.status === 'calculated'
                      ? styles.statusCalculated
                      : activeRun.status === 'approved'
                      ? styles.statusApproved
                      : styles.statusPaid
                  }`}
                >
                  {activeRun.status}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-muted-text)' }}>
                {activeRun.totalEmployees} employees • Gross: {formatINR(activeRun.totalGross)} • Deductions: -{formatINR(activeRun.totalDeductions)}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Estimated Net Payout
                </span>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(activeRun.totalAmount)}
                </div>
              </div>

              <button
                onClick={() => setSelectedRunId(activeRun.id)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <span>Manage Cycle</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll History Section */}
      <div className={styles.runDetailsCard}>
        <div className={styles.runHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Payroll Cycle History & Disbursed Logs
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={styles.selectInput}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              <option value="all">All Statuses ({payrollRuns.length})</option>
              <option value="paid">Paid / Disbursed</option>
              <option value="approved">Approved</option>
              <option value="calculated">Calculated</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.payrollTable}>
            <thead>
              <tr>
                <th>Payroll Period</th>
                <th>Cycle ID</th>
                <th>Staff Count</th>
                <th>Gross Pay</th>
                <th>Total Deductions</th>
                <th>Net Disbursement</th>
                <th>Workflow Status</th>
                <th>Disbursed On / Ledger Ref</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted-text)' }}>
                    No payroll runs found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredRuns.map(r => {
                  const [y, m] = r.month.split('-');
                  const mName = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric'
                  });

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                        {mName}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                        <code>{r.id}</code>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {r.totalEmployees} Employees
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {formatINR(r.totalGross)}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#dc2626', fontWeight: 600 }}>
                        -{formatINR(r.totalDeductions)}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 15, color: '#059669' }}>
                        {formatINR(r.totalAmount)}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusChip} ${
                            r.status === 'draft'
                              ? styles.statusDraft
                              : r.status === 'calculated'
                              ? styles.statusCalculated
                              : r.status === 'approved'
                              ? styles.statusApproved
                              : styles.statusPaid
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                        {r.paidAt ? (
                          <div>
                            <div>{new Date(r.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            {r.ledgerEntryId && <code style={{ fontSize: 10 }}>{r.ledgerEntryId}</code>}
                          </div>
                        ) : (
                          <span>Pending Payment</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedRunId(r.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-primary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span>Open Details</span>
                          <ArrowRight size={13} />
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

      {/* New Payroll Run Modal */}
      <NewPayrollRunModal
        isOpen={newRunModalOpen}
        onClose={() => setNewRunModalOpen(false)}
        onCreated={newId => setSelectedRunId(newId)}
      />
    </div>
  );
};
