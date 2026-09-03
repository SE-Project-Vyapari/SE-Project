import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockApi } from '../../../services/mockApi';
import type { ChurnScore, Customer, Product, InventoryRecord } from '../../../types';
import {
  X,
  Sparkles,
  Send,
  CalendarPlus,
  CheckCircle,
  AlertTriangle,
  Info,
  User,
  ArrowRight
} from 'lucide-react';
import styles from '../styles/churn-insights.module.css';

interface ChurnReviewDrawerProps {
  churnScore: ChurnScore;
  customer?: Customer;
  product?: Product;
  inventory?: InventoryRecord;
  onClose: () => void;
  onScoreUpdated: (updated: ChurnScore) => void;
}

export const ChurnReviewDrawer: React.FC<ChurnReviewDrawerProps> = ({
  churnScore,
  customer,
  product,
  inventory,
  onClose,
  onScoreUpdated
}) => {
  const navigate = useNavigate();
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    `Hello ${customer?.name || 'Valued Customer'}, we noticed you might be running low on ${product?.name || 'your regular items'}. Would you like us to arrange a fresh delivery for you today?`
  );
  const [messageSuccess, setMessageSuccess] = useState(false);

  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  const [followUpNote] = useState(
    `Churn intervention: Follow up with ${customer?.name || 'customer'} regarding ${product?.name || 'reorder'}`
  );

  const isOptedOut = customer?.optInForMessages === false;
  const isOutOfStock = inventory ? inventory.quantity <= 0 : false;

  const handleSendMessage = async () => {
    if (isOptedOut || !customer) return;
    setIsSendingMessage(true);
    try {
      await mockApi.sendCustomerMessage({
        recipient: customer.phone || customer.email || customer.name,
        content: customMessage,
        channel: 'whatsapp',
        customerId: customer.id
      });
      setMessageSuccess(true);
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSuccess(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!customer) return;
    setIsCreatingFollowUp(true);
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await mockApi.createFollowUp({
        customerId: customer.id,
        note: followUpNote,
        dueDate: tomorrow,
        isSuggested: true
      });
      setFollowUpSuccess(true);
      setTimeout(() => setFollowUpSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to create follow-up task');
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  const handleMarkReviewed = async () => {
    try {
      await mockApi.markChurnScoreReviewed(churnScore.id);
      onScoreUpdated({ ...churnScore, reviewed: true });
    } catch (err: any) {
      alert(err.message || 'Failed to mark as reviewed');
    }
  };

  // Badge styling
  let riskBadgeClass = styles.badgeLow;
  let riskLabel = 'Low Risk';
  if (churnScore.status === 'insufficient_history') {
    riskBadgeClass = styles.badgeInsufficient;
    riskLabel = 'Not Enough History';
  } else if (churnScore.riskLevel === 'high') {
    riskBadgeClass = styles.badgeHigh;
    riskLabel = 'High Risk';
  } else if (churnScore.riskLevel === 'medium') {
    riskBadgeClass = styles.badgeMedium;
    riskLabel = 'Medium Risk';
  }

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`${styles.badge} ${riskBadgeClass}`}>
                {riskLabel} ({churnScore.score}%)
              </span>
              <span className={styles.predictionTag}>
                <Sparkles size={10} style={{ marginRight: 3 }} /> Prediction
              </span>
              {churnScore.reviewed && (
                <span className={styles.reviewedTag}>
                  <CheckCircle size={12} /> Reviewed
                </span>
              )}
            </div>
            <h2 style={{ margin: '8px 0 2px 0', fontSize: 20 }}>
              {customer?.name || 'Customer'}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--color-muted-text)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span>{product?.name || 'Product'}</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>{customer?.type || 'Retail'}</span>
            </div>
          </div>

          <button onClick={onClose} className={styles.drawerCloseBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.drawerBody}>
          {/* Stock Alert Warning if Out of Stock */}
          {isOutOfStock && (
            <div
              style={{
                backgroundColor: 'rgba(184, 74, 62, 0.1)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--color-danger)',
                fontSize: 13
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Inventory Warning:</strong> This product is currently <strong>out of stock</strong> in your store. Restock inventory before triggering promotional reorder campaigns.
              </div>
            </div>
          )}

          {/* Opt-out Alert Banner */}
          {isOptedOut && (
            <div
              style={{
                backgroundColor: 'rgba(184, 134, 59, 0.1)',
                border: '1px solid var(--color-warning)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--color-warning)',
                fontSize: 13
              }}
            >
              <Info size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Communication Notice:</strong> This customer has opted out of automated messages. Direct WhatsApp/SMS is restricted. Use voice calls or in-person engagement.
              </div>
            </div>
          )}

          {/* RFM Metrics Snapshot */}
          <div className={styles.factorsGrid}>
            <div className={styles.factorCard}>
              <div className={styles.factorCardLabel}>Days Since Last</div>
              <div className={styles.factorCardValue}>
                {churnScore.daysSinceLastPurchase !== undefined ? `${churnScore.daysSinceLastPurchase}d` : '—'}
              </div>
            </div>

            <div className={styles.factorCard}>
              <div className={styles.factorCardLabel}>Normal Interval</div>
              <div className={styles.factorCardValue}>
                {churnScore.averageIntervalDays ? `~${churnScore.averageIntervalDays}d` : 'N/A'}
              </div>
            </div>

            <div className={styles.factorCard}>
              <div className={styles.factorCardLabel}>Days Overdue</div>
              <div className={styles.factorCardValue} style={{ color: (churnScore.daysOverdue || 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {(churnScore.daysOverdue || 0) > 0 ? `+${churnScore.daysOverdue}d` : 'On track'}
              </div>
            </div>
          </div>

          {/* "Why?" Explanation Section */}
          <div className={styles.drawerSection}>
            <div className={styles.sectionTitle}>
              <Info size={14} color="var(--color-primary)" />
              Why is this score predicted? (Diagnostic Factors)
            </div>

            <ul className={styles.factorList}>
              {churnScore.factors?.map((factor, idx) => (
                <li key={idx}>
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested Intervention Action */}
          <div className={styles.drawerSection} style={{ backgroundColor: 'rgba(198, 93, 58, 0.04)', borderColor: 'rgba(198, 93, 58, 0.2)' }}>
            <div className={styles.sectionTitle} style={{ color: 'var(--color-primary)' }}>
              <Sparkles size={14} />
              Suggested Intervention Action
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-dark)' }}>
              {churnScore.suggestedAction}
            </div>
            {churnScore.revenueAtRisk ? (
              <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                Estimated Revenue at Risk: <strong className="tabular-nums">₹{churnScore.revenueAtRisk.toLocaleString('en-IN')}</strong>
              </div>
            ) : null}
          </div>

          {/* Customer CRM Deep Link */}
          {customer && (
            <div
              onClick={() => navigate(`/customers/${customer.id}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} />
                <span>View Full CRM Profile for {customer.name}</span>
              </div>
              <ArrowRight size={16} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.drawerFooter}>
          {followUpSuccess && (
            <div style={{ color: 'var(--color-success)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} /> CRM follow-up created successfully! Viewable on customer profile.
            </div>
          )}

          <div className={styles.actionButtonGroup}>
            {/* Send Message Button (respects opt-in) */}
            <div style={{ flex: 1, position: 'relative' }}>
              <button
                className={styles.btnPrimary}
                disabled={isOptedOut}
                onClick={() => setShowMessageModal(true)}
                title={isOptedOut ? 'Customer has opted out of promotional messages' : 'Send WhatsApp reorder reminder'}
              >
                <Send size={15} /> Send Reminder
              </button>
            </div>

            {/* Create Follow-up Button */}
            <button
              className={styles.btnSecondary}
              disabled={isCreatingFollowUp}
              onClick={handleCreateFollowUp}
            >
              <CalendarPlus size={15} />
              {isCreatingFollowUp ? 'Creating...' : 'Create Follow-up'}
            </button>
          </div>

          <button
            className={styles.btnReview}
            onClick={handleMarkReviewed}
            disabled={churnScore.reviewed}
          >
            <CheckCircle size={14} />
            {churnScore.reviewed ? 'Marked as Reviewed' : 'Mark as Reviewed & Dismiss'}
          </button>
        </div>
      </div>

      {/* Message Dispatch Simulation Modal */}
      {showMessageModal && (
        <div className={styles.modalOverlay} onClick={() => setShowMessageModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Dispatch WhatsApp Reorder Message</h3>
              <button onClick={() => setShowMessageModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>
              To: <strong>{customer?.name}</strong> ({customer?.phone || 'Phone on file'})
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Message Content</label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                className={styles.inputField}
                style={{ resize: 'vertical' }}
              />
            </div>

            {messageSuccess ? (
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(91, 122, 91, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} /> Message simulated and logged to MessageLog (Status: Delivered).
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowMessageModal(false)}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={isSendingMessage || messageSuccess}
                onClick={handleSendMessage}
              >
                {isSendingMessage ? 'Delivering...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
