import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, UserCheck, Calendar, Filter } from 'lucide-react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import styles from '../styles/employees.module.css';

interface BulkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSaved?: () => void;
}

interface BulkRowState {
  employeeId: string;
  name: string;
  role: string;
  outletId?: string;
  joiningDate: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  checkIn: string;
  checkOut: string;
  notes: string;
  isPreJoining: boolean;
}

export const BulkAttendanceModal: React.FC<BulkAttendanceModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  onSaved
}) => {
  const employees = useStore(state => state.employees);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const outlets = useStore(state => state.outlets);

  const [date, setDate] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [rows, setRows] = useState<BulkRowState[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize rows whenever date or employees change
  useEffect(() => {
    if (!isOpen) return;

    const activeEmployees = employees.filter(e => e.status === 'active');
    const newRows: BulkRowState[] = activeEmployees.map(emp => {
      const isPreJoining = date < emp.joiningDate;
      const existing = attendanceRecords.find(r => r.employeeId === emp.id && r.date === date);

      return {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        outletId: emp.outletId,
        joiningDate: emp.joiningDate,
        status: existing?.status || 'present',
        checkIn: existing?.checkIn || (existing?.status === 'late' ? '09:45' : '09:00'),
        checkOut: existing?.checkOut || '18:00',
        notes: existing?.notes || '',
        isPreJoining
      };
    });

    setRows(newRows);
  }, [isOpen, date, employees, attendanceRecords]);

  if (!isOpen) return null;

  const filteredRows = rows.filter(r => {
    if (selectedOutlet !== 'all' && r.outletId !== selectedOutlet) return false;
    return true;
  });

  const handleQuickMarkAllPresent = () => {
    setRows(prev =>
      prev.map(row => {
        if (row.isPreJoining) return row;
        return {
          ...row,
          status: 'present',
          checkIn: '09:00',
          checkOut: '18:00'
        };
      })
    );
  };

  const handleRowChange = (empId: string, updates: Partial<BulkRowState>) => {
    setRows(prev =>
      prev.map(r => {
        if (r.employeeId !== empId) return r;
        const updated = { ...r, ...updates };
        if (updates.status === 'absent' || updates.status === 'leave') {
          updated.checkIn = '';
          updated.checkOut = '';
        } else if (updates.status === 'present' && !updated.checkIn) {
          updated.checkIn = '09:00';
          updated.checkOut = '18:00';
        } else if (updates.status === 'late' && (!updated.checkIn || updated.checkIn === '09:00')) {
          updated.checkIn = '09:45';
          updated.checkOut = '18:15';
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const recordsToSave = rows
        .filter(r => !r.isPreJoining)
        .map(r => ({
          employeeId: r.employeeId,
          status: r.status,
          checkIn: ['present', 'late'].includes(r.status) && r.checkIn ? r.checkIn : undefined,
          checkOut: ['present', 'late'].includes(r.status) && r.checkOut ? r.checkOut : undefined,
          notes: r.notes.trim() || undefined
        }));

      await mockApi.bulkMarkAttendance({
        date,
        records: recordsToSave
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to bulk mark attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modalBox} ${styles.modalBoxWide}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={22} color="var(--color-primary)" />
            <div>
              <h3>Bulk Mark Attendance</h3>
              <p style={{ fontSize: 12, color: 'var(--color-muted-text)', margin: 0 }}>
                Quickly mark all active staff as present and adjust individual exceptions.
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Top Filter and Quick Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 16px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={16} color="var(--color-muted-text)" />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={styles.selectInput}
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Filter size={16} color="var(--color-muted-text)" />
                  <select
                    value={selectedOutlet}
                    onChange={e => setSelectedOutlet(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="all">All Outlets ({rows.length})</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickMarkAllPresent}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={16} />
                Quick-Mark All as Present (09:00 - 18:00)
              </button>
            </div>

            {/* Editable Employee Table */}
            <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Notes / Exception</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => {
                    if (row.isPreJoining) {
                      return (
                        <tr key={row.employeeId} style={{ backgroundColor: 'rgba(0,0,0,0.02)', opacity: 0.6 }}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{row.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{row.role}</div>
                          </td>
                          <td colSpan={4}>
                            <span style={{ fontSize: 12, color: 'var(--color-muted-text)', fontStyle: 'italic' }}>
                              Pre-employment (Joined on {row.joiningDate}) — Attendance not applicable
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={row.employeeId}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{row.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{row.role}</div>
                        </td>
                        <td>
                          <select
                            value={row.status}
                            onChange={e => handleRowChange(row.employeeId, { status: e.target.value as any })}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor:
                                row.status === 'present'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : row.status === 'late'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : row.status === 'leave'
                                  ? 'rgba(139, 92, 246, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                              color:
                                row.status === 'present'
                                  ? '#059669'
                                  : row.status === 'late'
                                  ? '#d97706'
                                  : row.status === 'leave'
                                  ? '#7c3aed'
                                  : '#dc2626',
                              border: '1px solid var(--color-border)',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="leave">Leave</option>
                            <option value="absent">Absent</option>
                          </select>
                        </td>
                        <td>
                          {['present', 'late'].includes(row.status) ? (
                            <input
                              type="time"
                              value={row.checkIn}
                              onChange={e => handleRowChange(row.employeeId, { checkIn: e.target.value })}
                              style={{ padding: '4px 6px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--color-muted-text)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          {['present', 'late'].includes(row.status) ? (
                            <input
                              type="time"
                              value={row.checkOut}
                              onChange={e => handleRowChange(row.employeeId, { checkOut: e.target.value })}
                              style={{ padding: '4px 6px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--color-muted-text)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={row.notes}
                            onChange={e => handleRowChange(row.employeeId, { notes: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              fontSize: 12,
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)'
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 24px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {saving ? 'Saving Attendance...' : `Save Attendance (${rows.filter(r => !r.isPreJoining).length} Employees)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
