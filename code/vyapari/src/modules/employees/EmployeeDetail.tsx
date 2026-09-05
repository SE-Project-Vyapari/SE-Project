import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Phone,
  Mail,
  Building,
  CheckCircle,
  AlertTriangle,
  Lock,
  Plus,
  Edit2,
  CalendarCheck,
  FileText,
  CreditCard
} from 'lucide-react';
import { useStore } from '../../services/store';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { formatINR } from '../../utils/format';
import { mockApi, computeAttendancePayrollDeduction } from '../../services/mockApi';
import { CheckInOutModal } from './components/CheckInOutModal';
import { ApplyLeaveModal } from './components/ApplyLeaveModal';
import type { AttendanceRecord } from '../../types';
import styles from './styles/employees.module.css';

export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const employees = useStore(state => state.employees);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const leaveRecords = useStore(state => state.leaveRecords);
  const outlets = useStore(state => state.outlets);

  const [activeTab, setActiveTab] = useState<'attendance' | 'salary' | 'leave' | 'activity'>('attendance');
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(() => new Date());

  // Modals
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | undefined>(undefined);
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>(undefined);

  const employee = employees.find(e => e.id === id);
  const outlet = employee?.outletId ? outlets.find(o => o.id === employee.outletId) : undefined;

  // Role permissions
  const canViewSalary = currentUser?.role === 'owner' || currentUser?.role === 'accountant';

  const year = selectedMonthDate.getFullYear();
  const month = selectedMonthDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = selectedMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Employee's attendance records for the selected month
  const monthAttendance = useMemo(() => {
    if (!employee) return [];
    return attendanceRecords
      .filter(r => r.employeeId === employee.id && r.date.startsWith(monthStr))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, employee, monthStr]);

  // Employee's leaves
  const employeeLeaves = useMemo(() => {
    if (!employee) return [];
    return leaveRecords
      .filter(l => l.employeeId === employee.id)
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
  }, [leaveRecords, employee]);

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;
    let incomplete = 0;
    let hours = 0;

    monthAttendance.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'absent') absent++;

      if (r.isIncomplete) incomplete++;
      hours += r.hoursWorked || 0;
    });

    const attendedDays = present + late;
    const totalRecordedDays = monthAttendance.length;
    const attendanceRate = totalRecordedDays > 0 ? Math.round((attendedDays / totalRecordedDays) * 100) : 0;

    return {
      present,
      late,
      leave,
      absent,
      incomplete,
      hours: Math.round(hours * 10) / 10,
      attendedDays,
      totalRecordedDays,
      attendanceRate
    };
  }, [monthAttendance]);

  // Payroll Deduction calculation (Attendance to Payroll Link Prompt 13/14)
  const payrollCalc = useMemo(() => {
    if (!employee) return { dailyRate: 0, totalUnpaidDays: 0, deductionAmount: 0, grossPayable: 0 };
    return computeAttendancePayrollDeduction(employee.salary, monthlyStats.absent, 0);
  }, [employee, monthlyStats]);

  if (!employee) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Employee Not Found</h2>
          <p style={{ color: 'var(--color-muted-text)', marginTop: 8 }}>
            The requested employee profile does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/employees')}
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
            Back to Employee Directory
          </button>
        </div>
      </div>
    );
  }

  const initials = employee.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setSelectedAttendanceRecord(rec);
    setSelectedDateForModal(rec.date);
    setCheckInModalOpen(true);
  };

  const handleToggleStatus = async () => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    await mockApi.updateEmployee(employee.id, { status: newStatus });
  };

  return (
    <div className={styles.container}>
      {/* Back Navigation Bar */}
      <div>
        <button
          onClick={() => navigate('/employees')}
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
          <ArrowLeft size={16} /> Back to Employee Directory
        </button>
      </div>

      {/* Profile Header Banner */}
      <div className={styles.profileBanner}>
        <div className={styles.profileHeaderTop}>
          <div className={styles.profileAvatarGroup}>
            <div className={styles.largeAvatar}>
              {initials}
            </div>

            <div className={styles.profileInfo}>
              <h2>
                {employee.name}
                <span className={`${styles.statusChip} ${employee.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                  {employee.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </h2>

              <div className={styles.profileMetaTags}>
                <span className={styles.roleBadge}>{employee.role}</span>
                <span>•</span>
                <span>{employee.department || 'Operations'}</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building size={14} color="var(--color-muted-text)" />
                  {outlet?.name || 'Downtown Branch'}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={14} color="var(--color-muted-text)" />
                  {employee.phone}
                </span>
                {employee.email && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={14} color="var(--color-muted-text)" />
                      {employee.email}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleToggleStatus}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Mark as {employee.status === 'active' ? 'Inactive' : 'Active'}
            </button>

            <button
              onClick={() => {
                setSelectedAttendanceRecord(undefined);
                setSelectedDateForModal(new Date().toISOString().split('T')[0]);
                setCheckInModalOpen(true);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Clock size={16} /> Log Punch
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className={styles.profileQuickStats}>
          <div className={styles.quickStatItem}>
            <span className={styles.quickStatLabel}>Joining Date</span>
            <div className={styles.quickStatValue} style={{ fontSize: 15 }}>
              {new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div className={styles.quickStatItem}>
            <span className={styles.quickStatLabel}>This Month Attendance</span>
            <div className={styles.quickStatValue} style={{ color: monthlyStats.attendanceRate >= 90 ? '#059669' : '#d97706' }}>
              {monthlyStats.attendanceRate}%
            </div>
          </div>

          <div className={styles.quickStatItem}>
            <span className={styles.quickStatLabel}>Days Present on Shift</span>
            <div className={styles.quickStatValue}>
              {monthlyStats.attendedDays} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted-text)' }}>days</span>
            </div>
          </div>

          <div className={styles.quickStatItem}>
            <span className={styles.quickStatLabel}>Total Hours Logged</span>
            <div className={styles.quickStatValue}>
              {monthlyStats.hours} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted-text)' }}>hrs</span>
            </div>
          </div>

          <div className={styles.quickStatItem}>
            <span className={styles.quickStatLabel}>Monthly Base Salary</span>
            <div className={styles.quickStatValue}>
              {canViewSalary ? (
                formatINR(employee.salary)
              ) : (
                <span style={{ fontSize: 12, color: 'var(--color-muted-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={12} /> Confidential
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <CalendarCheck size={16} /> Attendance Log & Calendar
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'salary' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('salary')}
        >
          <DollarSign size={16} /> Salary Structure & Payroll Link
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'leave' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          <Calendar size={16} /> Leave Balances & History
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'activity' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <FileText size={16} /> Activity & Audit Log
        </button>
      </div>

      {/* Tab 1: Attendance Log */}
      {activeTab === 'attendance' && (
        <div className={styles.tabContent}>
          {/* Month selector & summary bar */}
          <div className={styles.controlsBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setSelectedMonthDate(new Date(year, month - 1, 1))}
                className={styles.iconBtn}
              >
                ‹
              </button>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', minWidth: 160, textAlign: 'center' }}>
                {monthName}
              </div>
              <button
                onClick={() => setSelectedMonthDate(new Date(year, month + 1, 1))}
                className={styles.iconBtn}
              >
                ›
              </button>
              <button
                onClick={() => setSelectedMonthDate(new Date())}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Current Month
              </button>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
              <span>
                <strong style={{ color: '#059669' }}>{monthlyStats.present}</strong> Present
              </span>
              <span>
                <strong style={{ color: '#d97706' }}>{monthlyStats.late}</strong> Late
              </span>
              <span>
                <strong style={{ color: '#7c3aed' }}>{monthlyStats.leave}</strong> Leave
              </span>
              <span>
                <strong style={{ color: '#dc2626' }}>{monthlyStats.absent}</strong> Absent
              </span>
              {monthlyStats.incomplete > 0 && (
                <span style={{ color: '#b45309', fontWeight: 600 }}>
                  ⚠️ {monthlyStats.incomplete} Incomplete
                </span>
              )}
            </div>
          </div>

          {/* Daily Attendance History Table */}
          <div className={styles.tableCard}>
            <table className={styles.employeeTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Working Hours</th>
                  <th>Remarks / Audit</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted-text)' }}>
                      No attendance records found for {monthName}.
                    </td>
                  </tr>
                ) : (
                  monthAttendance.map(rec => {
                    const dateObj = new Date(rec.date);
                    const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });

                    return (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ color: 'var(--color-muted-text)', fontSize: 12 }}>
                          {dayName}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 12,
                              fontWeight: 700,
                              backgroundColor:
                                rec.status === 'present'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : rec.status === 'late'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : rec.status === 'leave'
                                  ? 'rgba(139, 92, 246, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                              color:
                                rec.status === 'present'
                                  ? '#059669'
                                  : rec.status === 'late'
                                  ? '#d97706'
                                  : rec.status === 'leave'
                                  ? '#7c3aed'
                                  : '#dc2626'
                            }}
                          >
                            {rec.status.toUpperCase()}
                            {rec.isEdited && <span style={{ fontSize: 10, color: 'var(--color-muted-text)' }}>✎ Edited</span>}
                          </span>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {rec.checkIn || '—'}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {rec.checkOut ? (
                            rec.checkOut
                          ) : rec.isIncomplete ? (
                            <span style={{ color: '#d97706', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Missing Checkout
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {rec.isIncomplete ? (
                            <span style={{ color: '#d97706', fontSize: 11 }}>Incomplete</span>
                          ) : rec.hoursWorked > 0 ? (
                            `${rec.hoursWorked} hrs`
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--color-muted-text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.notes || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className={styles.iconBtn}
                            title="Edit Record"
                            style={{ display: 'inline-flex' }}
                          >
                            <Edit2 size={14} />
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
      )}

      {/* Tab 2: Salary Structure & Payroll Integration */}
      {activeTab === 'salary' && (
        <div className={styles.tabContent}>
          {!canViewSalary ? (
            <div className={styles.salaryCard} style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Lock size={36} color="var(--color-muted-text)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ color: 'var(--color-danger)', marginBottom: 8 }}>Confidential Salary Structure</h3>
              <p style={{ color: 'var(--color-muted-text)', maxWidth: 460, margin: '0 auto' }}>
                Your current user role ({currentUser?.role}) does not have permission to view employee salary details or compensation structures.
                Access is restricted to Owner and Accountant roles.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.salaryCard}>
                <div className={styles.salaryHeader}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                      Monthly Compensation Structure
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--color-muted-text)', margin: '2px 0 0' }}>
                      Indian payroll structure with basic, HRA, and retail special allowances.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Gross Base Salary
                    </span>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(employee.salary)}
                    </div>
                  </div>
                </div>

                <div className={styles.salaryBreakdown}>
                  {/* Earnings column */}
                  <div className={styles.salaryList}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
                      Earnings Breakdown
                    </div>
                    <div className={styles.salaryRow}>
                      <span>Basic Pay (50%)</span>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(employee.salary * 0.5)}</strong>
                    </div>
                    <div className={styles.salaryRow}>
                      <span>House Rent Allowance / HRA (30%)</span>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(employee.salary * 0.3)}</strong>
                    </div>
                    <div className={styles.salaryRow}>
                      <span>Special / Retail Shift Allowance (20%)</span>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(employee.salary * 0.2)}</strong>
                    </div>
                    <div className={styles.salaryRowTotal}>
                      <span>Total Monthly CTC / Base Pay</span>
                      <span>{formatINR(employee.salary)}</span>
                    </div>
                  </div>

                  {/* Banking & Statutory column */}
                  <div className={styles.salaryList}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
                      Bank & Statutory Information
                    </div>
                    <div className={styles.salaryRow}>
                      <span>PAN Number</span>
                      <strong>{employee.panNumber || 'ABCDE1234F'}</strong>
                    </div>
                    <div className={styles.salaryRow}>
                      <span>Bank Account Number</span>
                      <strong>{employee.bankDetails?.accountNo || '918273645100'}</strong>
                    </div>
                    <div className={styles.salaryRow}>
                      <span>Bank & Branch</span>
                      <strong>{employee.bankDetails?.bankName || 'HDFC Bank, Connaught Place'}</strong>
                    </div>
                    <div className={styles.salaryRow}>
                      <span>IFSC Code</span>
                      <strong>{employee.bankDetails?.ifsc || 'HDFC0001234'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance-to-Payroll Integration Formula Box */}
              <div className={styles.payrollIntegrationBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CreditCard size={22} color="var(--color-primary)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                      Attendance-to-Payroll Integration (Formula & Deduction Engine)
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-muted-text)' }}>
                      This employee's monthly attendance directly feeds into the upcoming Payroll module (Prompt 14) for automated salary disbursement.
                    </p>
                  </div>
                </div>

                <div className={styles.formulaBadge}>
                  Deduction = (Unpaid Leave Days + Unexcused Absent Days) × (Monthly Base Salary ÷ 30)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 6 }}>
                  <div style={{ backgroundColor: 'var(--color-surface)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Daily Wage Rate (Base ÷ 30)</span>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{formatINR(payrollCalc.dailyRate)} / day</div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-surface)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Unpaid / Absent Days This Month</span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: payrollCalc.totalUnpaidDays > 0 ? '#dc2626' : '#059669', marginTop: 2 }}>
                      {payrollCalc.totalUnpaidDays} days
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-surface)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Attendance Deduction</span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
                      -{formatINR(payrollCalc.deductionAmount)}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-surface)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>Estimated Gross Payable</span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                      {formatINR(payrollCalc.grossPayable)}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 4 }}>
                  💡 Payroll history, salary slips generation, and one-click bank batch transfers will be processed in the upcoming <strong>Payroll Module (Prompt 14)</strong>.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Leave Balances & History */}
      {activeTab === 'leave' && (
        <div className={styles.tabContent}>
          {/* Leave Balances Grid */}
          <div className={styles.leaveGrid}>
            <div className={styles.leaveCard}>
              <div className={styles.leaveTypeTitle}>Casual Leave (CL)</div>
              <div className={styles.leaveNumber}>{employee.leaveBalance?.casual ?? 8}</div>
              <div className={styles.leaveSubtext}>Days available for personal needs</div>
            </div>

            <div className={styles.leaveCard}>
              <div className={styles.leaveTypeTitle}>Sick Leave (SL)</div>
              <div className={styles.leaveNumber} style={{ color: '#059669' }}>
                {employee.leaveBalance?.sick ?? 6}
              </div>
              <div className={styles.leaveSubtext}>Days available for medical recovery</div>
            </div>

            <div className={styles.leaveCard}>
              <div className={styles.leaveTypeTitle}>Earned / Paid Leave (PL)</div>
              <div className={styles.leaveNumber} style={{ color: '#7c3aed' }}>
                {employee.leaveBalance?.paid ?? 12}
              </div>
              <div className={styles.leaveSubtext}>Annual accrued paid leave days</div>
            </div>

            <div className={styles.leaveCard} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={() => setApplyLeaveModalOpen(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={16} /> Apply Leave
              </button>
            </div>
          </div>

          {/* Leave History Table */}
          <div className={styles.tableCard}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14 }}>
              Leave History & Approvals
            </div>
            <table className={styles.employeeTable}>
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Date Range</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Applied On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employeeLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-muted-text)' }}>
                      No leave requests recorded for this employee.
                    </td>
                  </tr>
                ) : (
                  employeeLeaves.map(l => (
                    <tr key={l.id}>
                      <td>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {l.type} Leave
                        </span>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} —{' '}
                        {new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.days} Day(s)</td>
                      <td style={{ maxWidth: 300, color: 'var(--color-text)' }}>{l.reason}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-muted-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(l.appliedOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                          <CheckCircle size={12} /> Approved
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Activity & Audit */}
      {activeTab === 'activity' && (
        <div className={styles.tabContent}>
          <div className={styles.tableCard} style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Employee Timeline & Audit Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '2px solid var(--color-border)', paddingLeft: 16, marginLeft: 8 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
                  Active Employment Status Verified
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                  Assigned to {outlet?.name || 'Downtown Branch'} • Role: {employee.role}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#059669' }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
                  Monthly Attendance Cycle Initialized
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                  {monthlyStats.attendedDays} days attendance logged with {monthlyStats.hours} total working hours.
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#64748b' }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
                  Employee Profile Created
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                  Onboarded on {new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check In / Out Modal */}
      <CheckInOutModal
        isOpen={checkInModalOpen}
        onClose={() => {
          setCheckInModalOpen(false);
          setSelectedAttendanceRecord(undefined);
          setSelectedDateForModal(undefined);
        }}
        employeeId={employee.id}
        date={selectedDateForModal}
        existingRecord={selectedAttendanceRecord}
      />

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={applyLeaveModalOpen}
        onClose={() => setApplyLeaveModalOpen(false)}
        employeeId={employee.id}
      />
    </div>
  );
};
