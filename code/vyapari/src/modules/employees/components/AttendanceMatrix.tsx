import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search, Edit3 } from 'lucide-react';
import { useStore } from '../../../services/store';
import { CheckInOutModal } from './CheckInOutModal';
import type { AttendanceRecord, Employee } from '../../../types';
import styles from '../styles/employees.module.css';

interface AttendanceMatrixProps {
  onOpenCheckInModal?: (empId?: string, date?: string, record?: AttendanceRecord) => void;
}

export const AttendanceMatrix: React.FC<AttendanceMatrixProps> = () => {
  const employees = useStore(state => state.employees);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const outlets = useStore(state => state.outlets);

  // Month and Year state (defaults to current date)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | undefined>(undefined);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Compute days in the current month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: { dayNum: number; dateStr: string; dayName: string; isToday: boolean; isWeekend: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dateObj.getDay();
      days.push({
        dayNum: d,
        dateStr,
        dayName: dateObj.toLocaleDateString('en-IN', { weekday: 'narrow' }),
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    return days;
  }, [year, month]);

  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.status !== 'active') return false;
      if (outletFilter !== 'all' && emp.outletId !== outletFilter) return false;
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesRole = emp.role.toLowerCase().includes(q);
        if (!matchesName && !matchesRole) return false;
      }
      return true;
    });
  }, [employees, outletFilter, departmentFilter, searchQuery]);

  // Lookup map for fast record indexing: key = `${employeeId}_${date}`
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(r => {
      map.set(`${r.employeeId}_${r.date}`, r);
    });
    return map;
  }, [attendanceRecords]);

  // Compute monthly stats per employee
  const employeeStats = useMemo(() => {
    const stats = new Map<string, { present: number; late: number; leave: number; absent: number; hours: number; totalDays: number }>();

    filteredEmployees.forEach(emp => {
      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;
      let hours = 0;
      let totalDays = 0;

      daysInMonth.forEach(day => {
        if (day.dateStr < emp.joiningDate) return; // pre-employment
        const record = recordMap.get(`${emp.id}_${day.dateStr}`);
        if (!record) return;

        totalDays++;
        if (record.status === 'present') {
          present++;
          hours += record.hoursWorked || 0;
        } else if (record.status === 'late') {
          late++;
          hours += record.hoursWorked || 0;
        } else if (record.status === 'leave') {
          leave++;
        } else if (record.status === 'absent') {
          absent++;
        }
      });

      stats.set(emp.id, {
        present,
        late,
        leave,
        absent,
        hours: Math.round(hours * 10) / 10,
        totalDays
      });
    });

    return stats;
  }, [filteredEmployees, daysInMonth, recordMap]);

  const handleCellClick = (emp: Employee, dayDateStr: string) => {
    if (dayDateStr < emp.joiningDate) {
      return; // Do not allow editing before joining date
    }
    const rec = recordMap.get(`${emp.id}_${dayDateStr}`);
    setSelectedEmpId(emp.id);
    setSelectedDate(dayDateStr);
    setSelectedRecord(rec);
    setModalOpen(true);
  };

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  return (
    <div className={styles.matrixContainer}>
      {/* Month Navigation and Search Bar */}
      <div className={styles.matrixControls}>
        <div className={styles.monthNav}>
          <button
            onClick={handlePrevMonth}
            className={styles.iconBtn}
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarIcon size={18} color="var(--color-primary)" />
            <span className={styles.monthTitle}>{monthName}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className={styles.iconBtn}
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleCurrentMonth}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)'
              }}
            />
          </div>

          <select
            value={outletFilter}
            onChange={e => setOutletFilter(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}
          >
            <option value="all">All Outlets</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix Horizontal Scroll Grid with Sticky Column */}
      <div className={styles.matrixScrollWrapper}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.stickyCol}>
                <div style={{ textAlign: 'left', paddingLeft: 8 }}>Employee ({filteredEmployees.length})</div>
              </th>
              {daysInMonth.map(d => (
                <th
                  key={d.dateStr}
                  className={d.isToday ? styles.todayColHeader : undefined}
                  style={d.isWeekend ? { backgroundColor: 'rgba(0,0,0,0.02)' } : undefined}
                >
                  <div className={styles.dayHeadContent}>
                    <span className={styles.dayHeadNum}>{d.dayNum}</span>
                    <span className={styles.dayHeadName}>{d.dayName}</span>
                  </div>
                </th>
              ))}
              <th className={styles.stickyRightCol}>Monthly Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const stat = employeeStats.get(emp.id) || { present: 0, late: 0, leave: 0, absent: 0, hours: 0, totalDays: 0 };
              const outlet = outlets.find(o => o.id === emp.outletId);
              const presentRatio = stat.totalDays > 0 ? Math.round(((stat.present + stat.late) / stat.totalDays) * 100) : 0;

              return (
                <tr key={emp.id}>
                  {/* Sticky Employee Column */}
                  <td className={styles.stickyCol}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
                      <div className={styles.avatar} style={{ width: 30, height: 30, fontSize: 12 }}>
                        {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-muted-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.role} • {outlet?.name.split(' ')[0] || 'Store'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Day Columns */}
                  {daysInMonth.map(day => {
                    const isPreJoining = day.dateStr < emp.joiningDate;
                    const record = recordMap.get(`${emp.id}_${day.dateStr}`);

                    if (isPreJoining) {
                      return (
                        <td key={day.dateStr} title={`Pre-employment (Joined on ${emp.joiningDate})`}>
                          <div className={`${styles.attendanceCell} ${styles.cellPreJoining}`}>
                            —
                          </div>
                        </td>
                      );
                    }

                    if (!record) {
                      return (
                        <td key={day.dateStr}>
                          <div
                            className={`${styles.attendanceCell} ${styles.cellEmpty}`}
                            onClick={() => handleCellClick(emp, day.dateStr)}
                            title={`No record for ${day.dateStr}. Click to mark attendance.`}
                          >
                            ·
                          </div>
                        </td>
                      );
                    }

                    let cellClass = styles.cellPresent;
                    let label = 'P';
                    if (record.status === 'late') {
                      cellClass = styles.cellLate;
                      label = 'L';
                    } else if (record.status === 'absent') {
                      cellClass = styles.cellAbsent;
                      label = 'A';
                    } else if (record.status === 'leave') {
                      cellClass = styles.cellLeave;
                      label = 'LV';
                    }

                    if (record.isIncomplete) {
                      cellClass = styles.cellIncomplete;
                      label = '!';
                    }

                    const tooltipText = `${emp.name} • ${day.dateStr}
Status: ${record.status.toUpperCase()}
${record.checkIn ? `In: ${record.checkIn}` : ''} ${record.checkOut ? `| Out: ${record.checkOut}` : ''}
${record.isIncomplete ? '⚠️ Missing Check-Out' : `Hours: ${record.hoursWorked} hrs`}
${record.notes ? `Note: ${record.notes}` : ''}
${record.isEdited ? '(Edited record)' : ''}
(Click to edit)`;

                    return (
                      <td key={day.dateStr}>
                        <div
                          className={`${styles.attendanceCell} ${cellClass}`}
                          onClick={() => handleCellClick(emp, day.dateStr)}
                          title={tooltipText}
                        >
                          {label}
                          {record.isEdited && <span className={styles.editedIndicator} />}
                        </div>
                      </td>
                    );
                  })}

                  {/* Sticky Summary Column */}
                  <td className={styles.stickyRightCol}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 6px', fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
                        <span style={{ color: '#059669' }} title="Present">{stat.present}P</span>
                        <span style={{ color: '#d97706' }} title="Late">{stat.late}L</span>
                        <span style={{ color: '#7c3aed' }} title="Leave">{stat.leave}LV</span>
                        <span style={{ color: '#dc2626' }} title="Absent">{stat.absent}A</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-muted-text)', fontSize: 10 }}>
                        <span>{stat.hours} hrs</span>
                        <span style={{ fontWeight: 700, color: presentRatio >= 90 ? '#059669' : presentRatio >= 75 ? '#d97706' : '#dc2626' }}>
                          {presentRatio}%
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Instructions Bar */}
      <div className={styles.matrixLegend}>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendBox} ${styles.cellPresent}`} />
            <span><strong>P</strong> - Present</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendBox} ${styles.cellLate}`} />
            <span><strong>L</strong> - Late Arrival</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendBox} ${styles.cellLeave}`} />
            <span><strong>LV</strong> - Approved Leave</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendBox} ${styles.cellAbsent}`} />
            <span><strong>A</strong> - Absent / Unexcused</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendBox} ${styles.cellIncomplete}`} />
            <span><strong>!</strong> - Incomplete Punch</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendBox} ${styles.cellPreJoining}`} />
            <span>Pre-employment / Not Joined</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-muted-text)' }}>
          <Edit3 size={14} />
          <span>Click any cell to log or adjust check-in/out times</span>
        </div>
      </div>

      {/* Check In / Out Modal */}
      <CheckInOutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employeeId={selectedEmpId}
        date={selectedDate}
        existingRecord={selectedRecord}
      />
    </div>
  );
};
