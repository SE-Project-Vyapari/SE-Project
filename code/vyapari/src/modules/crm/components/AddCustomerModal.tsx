import React, { useState } from 'react';
import { mockApi } from '../../../services/mockApi';
import type { Customer } from '../../../types';
import { X, UserPlus } from 'lucide-react';
import styles from '../styles/crm.module.css';

interface AddCustomerModalProps {
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  onClose,
  onCustomerCreated
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'retail' | 'wholesale'>('retail');
  const [address, setAddress] = useState('');
  const [optInForMessages, setOptInForMessages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide a customer name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newCustomer = await mockApi.createCustomer({
        businessId: 'b-1',
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        type,
        address: address.trim() || undefined,
        optInForMessages
      });

      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: 18 }}>Add New Customer</h3>
          </div>
          <button onClick={onClose} className={styles.modalCloseBtn}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="customerName">Full Name *</label>
            <input
              id="customerName"
              type="text"
              placeholder="e.g. Acme Corp or Rajesh Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.inputField}
              required
              autoFocus
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="customerPhone">Phone Number</label>
              <input
                id="customerPhone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="customerType">Customer Type</label>
              <select
                id="customerType"
                value={type}
                onChange={e => setType(e.target.value as 'retail' | 'wholesale')}
                className={styles.selectField}
              >
                <option value="retail">Retail (B2C)</option>
                <option value="wholesale">Wholesale (B2B)</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="customerEmail">Email Address</label>
            <input
              id="customerEmail"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.inputField}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="customerAddress">Address</label>
            <textarea
              id="customerAddress"
              rows={2}
              placeholder="Street, Area, City, Pincode"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className={styles.textareaField}
            />
          </div>

          <div style={{ marginTop: 6, padding: '10px 12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={optInForMessages}
                onChange={e => setOptInForMessages(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>Opt-in for promotional updates & WhatsApp messages</span>
            </label>
            <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 4, marginLeft: 24 }}>
              If unchecked, automated WhatsApp messages and alerts will be suppressed.
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 500,
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
