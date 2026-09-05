import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Calendar,
  Search,
  Eye,
  Phone,
  Building,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useStore } from '../../services/store';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { formatINR } from '../../utils/format';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import styles from './styles/employees.module.css';

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const employees = useStore(state => state.employees);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const outlets = useStore(state => state.outlets);

  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Role permissions: Salary is visible only for Owner & Accountant
  const canViewSalary = currentUser?.role === 'owner' || currentUser?.role === 'accountant';

  const outletMap = useMemo(() => {
    return new Map(outlets.map(o => [o.id, o]));
  }, [outlets]);

  // Current month prefix (YYYY-MM)
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);

  // Compute attendance stats per employee for current month
  const attendanceSummaryMap = useMemo(() => {
    const map = new Map<string, { presentCount: number; totalDays: number; rate: number }>();
    const monthRecords = attendanceRecords.filter(r => r.date.startsWith(currentMonthStr));

    employees.forEach(emp => {
      const empMonthRecords = monthRecords.filter(r => r.employeeId === emp.id);
      const attended = empMonthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const totalDays = empMonthRecords.length;
      const rate = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 0;

      map.set(emp.id, {
        presentCount: attended,
        totalDays,
        rate
      });
    });

    return map;
  }, [employees, attendanceRecords, currentMonthStr]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (outletFilter !== 'all' && emp.outletId !== outletFilter) return false;
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchRole = emp.role.toLowerCase().includes(q);
        const matchPhone = emp.phone.toLowerCase().includes(q);
        const matchEmail = emp.email?.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchPhone && !matchEmail) return false;
      }

      return true;
    });
  }, [employees, statusFilter, outletFilter, departmentFilter, searchQuery]);

  // KPI Overview counts
  const kpiData = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const avgAttendance =
      active > 0
        ? Math.round(
            employees
              .filter(e => e.status === 'active')
              .map(e => attendanceSummaryMap.get(e.id)?.rate || 0)
              .reduce((a, b) => a + b, 0) / active
          )
        : 0;

    return { total, active, avgAttendance };
  }, [employees, attendanceSummaryMap]);

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Employee Management</h1>
          <p className={styles.subtitle}>
            Manage staff profiles, outlets, attendance compliance, and payroll records.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={() => navigate('/employees/attendance')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Calendar size={16} /> Attendance Matrix
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
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
              gap: 6,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <UserPlus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)' }}>
            <Users size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Workforce</span>
            <span className={styles.kpiValue}>{kpiData.total}</span>
            <span className={styles.kpiSub}>{kpiData.active} active staff members</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Active Employment</span>
            <span className={styles.kpiValue}>{kpiData.active}</span>
            <span className={styles.kpiSub}>{kpiData.total - kpiData.active} inactive / offboarded</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Avg Monthly Attendance</span>
            <span className={styles.kpiValue}>{kpiData.avgAttendance}%</span>
            <span className={styles.kpiSub}>Compliance across 3 retail outlets</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
            <Building size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Outlets Operating</span>
            <span className={styles.kpiValue}>{outlets.length}</span>
            <span className={styles.kpiSub}>Downtown, Westside & Eastside</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, role, phone, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={outletFilter}
            onChange={e => setOutletFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">All Outlets ({employees.length})</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>
          Showing <strong>{filteredEmployees.length}</strong> of {employees.length} employees
        </div>
      </div>

      {/* Employee List Table */}
      <div className={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role / Department</th>
                <th>Outlet</th>
                <th>Phone Number</th>
                <th>Joining Date</th>
                <th>Monthly Salary</th>
                <th>Attendance (% This Month)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted-text)' }}>
                    No employees found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const outlet = emp.outletId ? outletMap.get(emp.outletId) : undefined;
                  const att = attendanceSummaryMap.get(emp.id) || { presentCount: 0, totalDays: 0, rate: 0 };
                  const initials = emp.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const fillPercent = Math.min(100, Math.max(0, att.rate));
                  const barColor = fillPercent >= 90 ? '#10b981' : fillPercent >= 75 ? '#f59e0b' : '#ef4444';

                  return (
                    <tr key={emp.id}>
                      {/* Employee (Avatar + Name + Email) */}
                      <td>
                        <div className={styles.employeeMeta}>
                          <div className={styles.avatar}>
                            {initials}
                          </div>
                          <div className={styles.employeeNameGroup}>
                            <span
                              className={styles.employeeName}
                              onClick={() => navigate(`/employees/${emp.id}`)}
                            >
                              {emp.name}
                            </span>
                            <span className={styles.employeeEmail}>
                              {emp.email || `EMP-${emp.id.replace('emp-', '')}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className={styles.roleBadge}>{emp.role}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{emp.department}</span>
                        </div>
                      </td>

                      {/* Outlet */}
                      <td>
                        <span className={styles.outletTag}>
                          <Building size={13} />
                          {outlet?.name || 'Downtown Branch'}
                        </span>
                      </td>

                      {/* Phone */}
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)' }}>
                          <Phone size={13} color="var(--color-muted-text)" />
                          <span>{emp.phone}</span>
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Salary (Role gated: Owner/Accountant only) */}
                      <td>
                        {canViewSalary ? (
                          <span className={styles.salaryCell}>
                            {formatINR(emp.salary)}
                          </span>
                        ) : (
                          <span className={styles.maskedSalary} title="Restricted: Visible to Owner and Accountant only">
                            <Lock size={12} /> Confidential
                          </span>
                        )}
                      </td>

                      {/* Attendance indicator */}
                      <td>
                        <div className={styles.attendanceMetric}>
                          <div className={styles.attendanceBarBg}>
                            <div
                              className={styles.attendanceBarFill}
                              style={{ width: `${fillPercent}%`, backgroundColor: barColor }}
                            />
                          </div>
                          <span className={styles.attendancePercent} style={{ color: barColor }}>
                            {att.rate}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`${styles.statusChip} ${emp.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: emp.status === 'active' ? '#059669' : '#6b7280' }} />
                          {emp.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          className={styles.iconBtn}
                          title="View Profile & Attendance"
                        >
                          <Eye size={15} />
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

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={newId => navigate(`/employees/${newId}`)}
      />
    </div>
  );
};
