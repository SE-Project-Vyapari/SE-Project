import React, { useState, useMemo } from 'react';
import { Search, Calendar, Edit2, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '../../../services/store';
import { CheckInOutModal } from './CheckInOutModal';
import type { AttendanceRecord } from '../../../types';
import styles from '../styles/employees.module.css';

export const AttendanceTable: React.FC = () => {
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const employees = useStore(state => state.employees);
  const outlets = useStore(state => state.outlets);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [outletFilter, setOutletFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // specific date or all

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | undefined>(undefined);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  const outletMap = useMemo(() => {
    return new Map(outlets.map(o => [o.id, o]));
  }, [outlets]);

  // Filtered attendance records sorted newest first
  const filteredRecords = useMemo(() => {
    return attendanceRecords
      .filter(rec => {
        const emp = employeeMap.get(rec.employeeId);
        if (!emp) return false;

        if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
        if (outletFilter !== 'all' && emp.outletId !== outletFilter) return false;
        if (dateFilter && rec.date !== dateFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = emp.name.toLowerCase().includes(q);
          const matchesRole = emp.role.toLowerCase().includes(q);
          const matchesNotes = rec.notes?.toLowerCase().includes(q);
          if (!matchesName && !matchesRole && !matchesNotes) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, employeeMap, statusFilter, outletFilter, dateFilter, searchQuery]);

  const handleEdit = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setEditModalOpen(true);
  };

  return (
    <div className={styles.tableCard}>
      {/* Search and Filters */}
      <div className={styles.controlsBar} style={{ border: 'none', borderBottom: '1px solid var(--color-border)', borderRadius: 0 }}>
        <div className={styles.filterGroup}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by staff name, role, or note..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="var(--color-muted-text)" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className={styles.selectInput}
              title="Filter by specific date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late Arrival</option>
            <option value="leave">Leave</option>
            <option value="absent">Absent</option>
          </select>

          <select
            value={outletFilter}
            onChange={e => setOutletFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">All Outlets</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>
          Showing <strong>{filteredRecords.length}</strong> records
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.employeeTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Outlet</th>
              <th>Status</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Hours Worked</th>
              <th>Remarks / Notes</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted-text)' }}>
                  No attendance records found matching the current filters.
                </td>
              </tr>
            ) : (
              filteredRecords.map(rec => {
                const emp = employeeMap.get(rec.employeeId);
                const outlet = emp?.outletId ? outletMap.get(emp.outletId) : undefined;

                return (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className={styles.employeeMeta}>
                        <div className={styles.avatar} style={{ width: 32, height: 32, fontSize: 12 }}>
                          {emp?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <div className={styles.employeeNameGroup}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{emp?.name || rec.employeeId}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{emp?.role}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.outletTag}>{outlet?.name || 'Downtown'}</span>
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
                        {rec.isEdited && (
                          <span title="Edited record" style={{ fontSize: 10, color: 'var(--color-muted-text)' }}>
                            ✎
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {rec.checkIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color="var(--color-muted-text)" />
                          <span>{rec.checkIn}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {rec.checkOut ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color="var(--color-muted-text)" />
                          <span>{rec.checkOut}</span>
                        </div>
                      ) : rec.isIncomplete ? (
                        <span style={{ color: '#d97706', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={12} /> Missing Checkout
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {rec.isIncomplete ? (
                        <span style={{ color: '#d97706', fontSize: 11 }}>Pending</span>
                      ) : rec.hoursWorked > 0 ? (
                        `${rec.hoursWorked} hrs`
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)' }}>—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-muted-text)', fontSize: 12 }}>
                      {rec.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleEdit(rec)}
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

      {/* Edit Modal */}
      {selectedRecord && (
        <CheckInOutModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedRecord(undefined);
          }}
          existingRecord={selectedRecord}
        />
      )}
    </div>
  );
};
