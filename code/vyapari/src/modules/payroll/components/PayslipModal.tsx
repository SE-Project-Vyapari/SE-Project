import React from 'react';
import { X, Printer, Building, ShieldCheck } from 'lucide-react';
import { useStore } from '../../../services/store';
import { formatINR } from '../../../utils/format';
import type { PayrollLineItem, PayrollRun } from '../../../types';
import styles from '../styles/payroll.module.css';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineItem?: PayrollLineItem;
  run?: PayrollRun;
}

// Helper to convert number to words for Indian Rupees
function numberToWordsINR(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';

  const convertLessThanOneThousand = (n: number): string => {
    let current = '';
    if (n >= 100) {
      current += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      current += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      current += ones[n] + ' ';
    }
    return current;
  };

  let result = '';
  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  const hundreds = remainder % 1000;

  if (crore > 0) result += convertLessThanOneThousand(crore) + 'Crore ';
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + 'Lakh ';
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + 'Thousand ';
  if (hundreds > 0) result += convertLessThanOneThousand(hundreds);

  return `Rupees ${result.trim()} Only`;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  lineItem,
  run
}) => {
  const employees = useStore(state => state.employees);
  const outlets = useStore(state => state.outlets);
  const businesses = useStore(state => state.businesses);

  if (!isOpen || !lineItem) return null;

  const employee = employees.find(e => e.id === lineItem.employeeId);
  const outlet = employee?.outletId ? outlets.find(o => o.id === employee.outletId) : outlets[0];
  const business = businesses[0] || { name: 'Aarav General Store', taxId: '07AAAAA0000A1Z5' };

  const [yearStr, monthNumStr] = (run?.month || '2026-09').split('-');
  const monthDate = new Date(parseInt(yearStr, 10), parseInt(monthNumStr, 10) - 1, 1);
  const formattedMonth = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modalBox} ${styles.modalBoxWide}`} onClick={e => e.stopPropagation()}>
        <div className={`${styles.modalHeader} ${styles.noPrint}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building size={20} color="var(--color-primary)" />
            <h3>Employee Salary Slip — {formattedMonth}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print / Download PDF
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.modalBody} style={{ backgroundColor: '#f8fafc', padding: 20 }}>
          {/* Printable Payslip Sheet */}
          <div className={styles.payslipSheet}>
            {/* Header */}
            <div className={styles.payslipHeader}>
              <div className={styles.businessBrand}>
                <h2>{business.name}</h2>
                <p>Retail & Wholesale ERP • {outlet?.name || 'Downtown Branch'}</p>
                <p>Address: {outlet?.address || '123 Main St, Connaught Place, New Delhi'}</p>
                <p>GSTIN: {business.taxId || '07AAAAA0000A1Z5'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Payslip For The Month Of
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {formattedMonth}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Status: <strong style={{ color: lineItem.paymentStatus === 'paid' ? '#059669' : '#d97706' }}>
                    {lineItem.paymentStatus === 'paid' ? 'PAID / DISBURSED' : 'CALCULATED (APPROVED)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Employee Metadata Table */}
            <div className={styles.payslipMetaTable}>
              <div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Employee Name:</span>
                  <span className={styles.payslipMetaValue}>{employee?.name}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Employee Code / ID:</span>
                  <span className={styles.payslipMetaValue}>{employee?.id.toUpperCase()}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Designation / Role:</span>
                  <span className={styles.payslipMetaValue}>{employee?.role}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Department:</span>
                  <span className={styles.payslipMetaValue}>{employee?.department || 'Operations'}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Date of Joining:</span>
                  <span className={styles.payslipMetaValue}>
                    {employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>

              <div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Bank Account No:</span>
                  <span className={styles.payslipMetaValue}>{employee?.bankDetails?.accountNo || '918273645100'}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Bank & Branch:</span>
                  <span className={styles.payslipMetaValue}>{employee?.bankDetails?.bankName || 'HDFC Bank'}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>IFSC Code:</span>
                  <span className={styles.payslipMetaValue}>{employee?.bankDetails?.ifsc || 'HDFC0001234'}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>PAN Number:</span>
                  <span className={styles.payslipMetaValue}>{employee?.panNumber || 'ABCDE1234F'}</span>
                </div>
                <div className={styles.payslipMetaRow}>
                  <span className={styles.payslipMetaLabel}>Days Worked / Total:</span>
                  <span className={styles.payslipMetaValue}>
                    {lineItem.presentDays + lineItem.lateDays + lineItem.leaveDays} / {lineItem.workingDays} Days
                  </span>
                </div>
              </div>
            </div>

            {lineItem.isProRated && (
              <div style={{ padding: '8px 12px', borderRadius: 4, backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} />
                <span><strong>Pro-rated Salary Notice:</strong> Employee joined mid-payroll cycle on {employee?.joiningDate}. Compensation is pro-rated for {lineItem.workingDays} calendar days.</span>
              </div>
            )}

            {/* Earnings and Deductions 2-Column Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Earnings Column */}
              <div>
                <table className={styles.salaryBreakdownTable}>
                  <thead>
                    <tr>
                      <th>Earnings Component</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Basic Salary (50%)</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {formatINR(lineItem.baseSalary * 0.5)}
                      </td>
                    </tr>
                    <tr>
                      <td>House Rent Allowance (HRA 30%)</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {formatINR(lineItem.hra)}
                      </td>
                    </tr>
                    <tr>
                      <td>Special / Shift Allowance (20%)</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {formatINR(lineItem.specialAllowance)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                      <td>Gross Total Earnings</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                        {formatINR(lineItem.grossEarnings)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions Column */}
              <div>
                <table className={styles.salaryBreakdownTable}>
                  <thead>
                    <tr>
                      <th>Deductions Component</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Attendance / Unpaid Days ({lineItem.absentDays}d @ {formatINR(lineItem.dailyRate)}/d)
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: lineItem.attendanceDeduction > 0 ? '#dc2626' : 'inherit' }}>
                        {formatINR(lineItem.attendanceDeduction)}
                      </td>
                    </tr>
                    <tr>
                      <td>Employee Provident Fund (EPF 12%)</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {formatINR(lineItem.statutoryDeductions)}
                      </td>
                    </tr>
                    <tr>
                      <td>Professional Tax / TDS</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        ₹0
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                      <td>Total Deductions</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                        {formatINR(lineItem.totalDeductions)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Pay Box */}
            <div className={styles.netPayBox}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#065f46', fontWeight: 700 }}>
                  Net Take-Home Salary Payable
                </span>
                <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                  {numberToWordsINR(lineItem.netPay)}
                </div>
              </div>
              <div className={styles.netPayAmount}>
                {formatINR(lineItem.netPay)}
              </div>
            </div>

            {/* Footer with Signatures */}
            <div className={styles.payslipFooter}>
              <div>
                <div>Note: Computer generated salary slip, requires no physical signature.</div>
                <div>Generated via Vyapari Retail & Wholesale ERP on {new Date().toLocaleDateString('en-IN')}.</div>
              </div>
              <div className={styles.signatureLine}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.modalFooter} ${styles.noPrint}`}>
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
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> Print Payslip
          </button>
        </div>
      </div>
    </div>
  );
};
