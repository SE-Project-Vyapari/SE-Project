import React from 'react';
import { Check, DollarSign } from 'lucide-react';
import type { PayrollRun } from '../../../types';
import styles from '../styles/payroll.module.css';

interface PayrollStepperProps {
  run: PayrollRun;
}

export const PayrollStepper: React.FC<PayrollStepperProps> = ({ run }) => {
  const steps = [
    {
      key: 'draft',
      label: '1. Draft',
      sub: run.createdAt ? `Created ${new Date(run.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Cycle initiated'
    },
    {
      key: 'calculated',
      label: '2. Calculated',
      sub: run.calculatedAt ? `Computed ${new Date(run.calculatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Attendance evaluated'
    },
    {
      key: 'approved',
      label: '3. Approved',
      sub: run.approvedAt ? `Approved by ${run.approvedBy || 'Owner'}` : 'Requires verification'
    },
    {
      key: 'paid',
      label: '4. Paid',
      sub: run.paidAt ? `Disbursed ${new Date(run.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Posted to Finance'
    }
  ];

  const statusOrder = ['draft', 'calculated', 'approved', 'paid'];
  const currentIndex = statusOrder.indexOf(run.status);

  return (
    <div className={styles.stepperContainer}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div
              className={`${styles.stepperItem} ${
                isCompleted ? styles.stepCompleted : isActive ? styles.stepActive : ''
              }`}
            >
              <div className={styles.stepCircle}>
                {isCompleted ? (
                  <Check size={16} />
                ) : idx === 3 ? (
                  <DollarSign size={16} />
                ) : (
                  idx + 1
                )}
              </div>
              <div className={styles.stepInfo}>
                <span className={styles.stepTitle}>{step.label}</span>
                <span className={styles.stepSub}>{step.sub}</span>
              </div>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`${styles.stepLine} ${
                  idx < currentIndex ? styles.stepLineCompleted : ''
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
