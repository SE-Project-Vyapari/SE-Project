import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Table as TableIcon,
  UserCheck,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useStore } from '../../services/store';
import { AttendanceMatrix } from './components/AttendanceMatrix';
import { AttendanceTable } from './components/AttendanceTable';
import { BulkAttendanceModal } from './components/BulkAttendanceModal';
import { CheckInOutModal } from './components/CheckInOutModal';
import styles from './styles/employees.module.css';

export const AttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const employees = useStore(state => state.employees);
  const attendanceRecords = useStore(state => state.attendanceRecords);

  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's stats calculation
  const todayStats = useMemo(() => {
    const activeStaff = employees.filter(e => e.status === 'active' && e.joiningDate <= todayStr);
    const todayRecords = attendanceRecords.filter(r => r.date === todayStr);

    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;
    let incomplete = 0;

    todayRecords.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'absent') absent++;

      if (r.isIncomplete) incomplete++;
    });

    const attended = present + late;
    const rate = activeStaff.length > 0 ? Math.round((attended / activeStaff.length) * 100) : 0;

    return {
      activeCount: activeStaff.length,
      present,
      late,
      leave,
      absent,
      incomplete,
      attended,
      rate
    };
  }, [employees, attendanceRecords, todayStr]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button
              onClick={() => navigate('/employees')}
              className={styles.iconBtn}
              title="Back to Employee Directory"
            >
              <ArrowLeft size={16} />
            </button>
            <h1>Attendance Tracking & Matrix</h1>
          </div>
          <p className={styles.subtitle}>
            Monitor real-time shifts, monthly check-in/out hours, and attendance deductions across all retail outlets.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
            <button
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'matrix' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'matrix' ? '#fff' : 'var(--color-muted-text)',
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <CalendarIcon size={14} /> Matrix View
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--color-muted-text)',
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <TableIcon size={14} /> Table View
            </button>
          </div>

          <button
            onClick={() => setCheckInModalOpen(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <Clock size={16} /> Log Single Punch
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
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
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <UserCheck size={16} /> Mark Attendance (Bulk)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Today's Attendance Rate</span>
            <span className={styles.kpiValue}>{todayStats.rate}%</span>
            <span className={styles.kpiSub}>{todayStats.attended} of {todayStats.activeCount} active staff on shift</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <Users size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Present / On Time</span>
            <span className={styles.kpiValue}>{todayStats.present}</span>
            <span className={styles.kpiSub}>Standard 9-hr retail shift logged</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Late Arrivals Today</span>
            <span className={styles.kpiValue}>{todayStats.late}</span>
            <span className={styles.kpiSub}>Traffic / commute delays logged</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed' }}>
            <CalendarIcon size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Approved Leaves</span>
            <span className={styles.kpiValue}>{todayStats.leave}</span>
            <span className={styles.kpiSub}>Casual & Sick leave recorded</span>
          </div>
        </div>

        {todayStats.incomplete > 0 && (
          <div className={styles.kpiCard} style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
            <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#b45309' }}>
              <AlertTriangle size={24} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel} style={{ color: '#b45309' }}>Incomplete Punches</span>
              <span className={styles.kpiValue} style={{ color: '#b45309' }}>{todayStats.incomplete}</span>
              <span className={styles.kpiSub}>Missing checkout punch detected</span>
            </div>
          </div>
        )}
      </div>

      {/* Main View Component */}
      {viewMode === 'matrix' ? <AttendanceMatrix /> : <AttendanceTable />}

      {/* Bulk Attendance Modal */}
      <BulkAttendanceModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        defaultDate={todayStr}
      />

      {/* Single Check In/Out Modal */}
      <CheckInOutModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        date={todayStr}
      />
    </div>
  );
};
