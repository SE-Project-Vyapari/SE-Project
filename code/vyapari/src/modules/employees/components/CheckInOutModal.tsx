import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStore } from '../../../services/store';
import { mockApi, computeWorkingHours } from '../../../services/mockApi';
import type { AttendanceRecord } from '../../../types';
import styles from '../styles/employees.module.css';

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  date?: string; // YYYY-MM-DD
  existingRecord?: AttendanceRecord;
  onSaved?: () => void;
}

export const CheckInOutModal: React.FC<CheckInOutModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  date,
  existingRecord,
  onSaved
}) => {
  const employees = useStore(state => state.employees);
  const selectedEmployee = employees.find(e => e.id === (employeeId || existingRecord?.employeeId));

  const [selectedEmpId, setSelectedEmpId] = useState<string>(employeeId || existingRecord?.employeeId || employees[0]?.id || '');
  const [recordDate, setRecordDate] = useState<string>(date || existingRecord?.date || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'present' | 'absent' | 'late' | 'leave'>(existingRecord?.status || 'present');
  const [checkIn, setCheckIn] = useState<string>(existingRecord?.checkIn || '09:00');
  const [checkOut, setCheckOut] = useState<string>(existingRecord?.checkOut || '18:00');
  const [notes, setNotes] = useState<string>(existingRecord?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingRecord) {
      setSelectedEmpId(existingRecord.employeeId);
      setRecordDate(existingRecord.date);
      setStatus(existingRecord.status);
      setCheckIn(existingRecord.checkIn || '');
      setCheckOut(existingRecord.checkOut || '');
      setNotes(existingRecord.notes || '');
    } else {
      if (employeeId) setSelectedEmpId(employeeId);
      if (date) setRecordDate(date);
      setStatus('present');
      setCheckIn('09:00');
      setCheckOut('18:00');
      setNotes('');
    }
  }, [existingRecord, employeeId, date, isOpen]);

  if (!isOpen) return null;

  // Auto-calculated working hours
  const { hours, isIncomplete } = computeWorkingHours(
    ['present', 'late'].includes(status) ? checkIn : undefined,
    ['present', 'late'].includes(status) ? checkOut : undefined
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const isPastDate = recordDate < todayStr;

  const handleStatusChange = (newStatus: 'present' | 'absent' | 'late' | 'leave') => {
    setStatus(newStatus);
    if (newStatus === 'present' && !checkIn) {
      setCheckIn('09:00');
      setCheckOut('18:00');
    } else if (newStatus === 'late' && (!checkIn || checkIn === '09:00')) {
      setCheckIn('09:45');
      setCheckOut('18:15');
    } else if (['absent', 'leave'].includes(newStatus)) {
      setCheckIn('');
      setCheckOut('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !recordDate) return;

    setSaving(true);
    try {
      await mockApi.recordAttendance({
        employeeId: selectedEmpId,
        date: recordDate,
        status,
        checkIn: ['present', 'late'].includes(status) && checkIn ? checkIn : undefined,
        checkOut: ['present', 'late'].includes(status) && checkOut ? checkOut : undefined,
        notes: notes.trim() || undefined
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save attendance record:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={20} color="var(--color-primary)" />
            <h3>{existingRecord ? 'Edit Attendance Record' : 'Log Time / Mark Attendance'}</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {isPastDate && (
              <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(99, 102, 241, 0.08)', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>ℹ️ Editing a past date ({recordDate}). Record will be marked with an <strong>Edited</strong> indicator for audit transparency.</span>
              </div>
            )}

            <div className={styles.formGrid}>
              {/* Employee Selection */}
              <div className={styles.formGroup}>
                <label>Employee</label>
                {selectedEmployee ? (
                  <input
                    type="text"
                    value={`${selectedEmployee.name} (${selectedEmployee.role})`}
                    disabled
                    style={{ backgroundColor: 'var(--color-surface)', cursor: 'not-allowed' }}
                  />
                ) : (
                  <select
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                    required
                  >
                    {employees.filter(e => e.status === 'active').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date */}
              <div className={styles.formGroup}>
                <label>Date</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                  max={todayStr}
                  required
                />
              </div>
            </div>

            {/* Attendance Status Selection */}
            <div className={styles.formGroup}>
              <label>Attendance Status (Single status per day)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { key: 'present', label: 'Present', color: '#10b981' },
                  { key: 'late', label: 'Late', color: '#f59e0b' },
                  { key: 'leave', label: 'Leave', color: '#8b5cf6' },
                  { key: 'absent', label: 'Absent', color: '#ef4444' }
                ].map(s => {
                  const isSelected = status === s.key;
                  return (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => handleStatusChange(s.key as any)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? `2px solid ${s.color}` : '1px solid var(--color-border)',
                        backgroundColor: isSelected ? `${s.color}15` : 'var(--color-background)',
                        color: isSelected ? s.color : 'var(--color-text)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {isSelected && <CheckCircle size={14} />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Check-In & Check-Out Time Inputs (for Present & Late) */}
            {['present', 'late'].includes(status) && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Check-In Time</label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={e => setCheckIn(e.target.value)}
                    placeholder="09:00"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Check-Out Time</label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={e => setCheckOut(e.target.value)}
                    placeholder="18:00"
                  />
                </div>
              </div>
            )}

            {/* Hours Calculation / Warning display */}
            {['present', 'late'].includes(status) && (
              <>
                {isIncomplete ? (
                  <div className={styles.incompleteWarning}>
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Missing Check-Out Time:</strong> Flagged as incomplete record. Working hours will remain uncomputed until checkout is logged.
                    </div>
                  </div>
                ) : (
                  <div className={styles.calculationCallout}>
                    <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                      Automatically Computed Working Hours:
                    </span>
                    <strong style={{ fontSize: 16, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                      {hours} hrs
                    </strong>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div className={styles.formGroup}>
              <label>Notes / Reason (Optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={status === 'late' ? 'Reason for late arrival...' : status === 'leave' ? 'Reason for leave...' : 'Add remarks or shift notes...'}
              />
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
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
