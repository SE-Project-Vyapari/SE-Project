import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import styles from '../styles/employees.module.css';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (empId: string) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onAdded }) => {
  const outlets = useStore(state => state.outlets);

  const [name, setName] = useState('');
  const [role, setRole] = useState('Sales Associate');
  const [department, setDepartment] = useState('Sales & Floor');
  const [outletId, setOutletId] = useState(outlets[0]?.id || 'o-1');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [salary, setSalary] = useState('25000');
  const [panNumber, setPanNumber] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !salary) return;

    setSaving(true);
    try {
      const created = await mockApi.createEmployee({
        businessId: 'b-1',
        outletId,
        name: name.trim(),
        role,
        department,
        phone: phone.trim(),
        email: email.trim() || undefined,
        joiningDate,
        salary: parseFloat(salary) || 20000,
        panNumber: panNumber.trim().toUpperCase() || undefined,
        bankDetails: accountNo.trim()
          ? {
              accountNo: accountNo.trim(),
              ifsc: ifsc.trim().toUpperCase(),
              bankName: bankName.trim() || 'HDFC Bank'
            }
          : undefined,
        emergencyContact: emergencyName.trim()
          ? {
              name: emergencyName.trim(),
              relation: 'Family',
              phone: emergencyPhone.trim()
            }
          : undefined
      });

      if (onAdded) onAdded(created.id);
      onClose();
    } catch (err) {
      console.error('Failed to add employee:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modalBox} ${styles.modalBoxWide}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={22} color="var(--color-primary)" />
            <h3>Add New Employee</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
              1. Basic & Role Information
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Designation / Role *</label>
                <select value={role} onChange={e => setRole(e.target.value)} required>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Senior Cashier">Senior Cashier</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Sales Associate">Sales Associate</option>
                  <option value="Inventory Supervisor">Inventory Supervisor</option>
                  <option value="Inventory Clerk">Inventory Clerk</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Delivery Executive">Delivery Executive</option>
                  <option value="Security & Facilities">Security & Facilities</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="Operations">Operations</option>
                  <option value="Front Desk">Front Desk</option>
                  <option value="Sales & Floor">Sales & Floor</option>
                  <option value="Logistics & Warehouse">Logistics & Warehouse</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Delivery & Dispatch">Delivery & Dispatch</option>
                  <option value="Security & Facilities">Security & Facilities</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Assigned Outlet *</label>
                <select value={outletId} onChange={e => setOutletId(e.target.value)} required>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="ramesh@aaravstores.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Joining Date *</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Monthly Base Salary (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  placeholder="25000"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginTop: 10 }}>
              2. Banking & Statutory Details (Confidential)
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>PAN Card Number</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={panNumber}
                  onChange={e => setPanNumber(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Bank Account Number</label>
                <input
                  type="text"
                  placeholder="987654321012"
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  maxLength={11}
                  value={ifsc}
                  onChange={e => setIfsc(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginTop: 10 }}>
              3. Emergency Contact
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Chandra (Spouse)"
                  value={emergencyName}
                  onChange={e => setEmergencyName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 99000 11222"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                />
              </div>
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
              {saving ? 'Creating Employee...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
