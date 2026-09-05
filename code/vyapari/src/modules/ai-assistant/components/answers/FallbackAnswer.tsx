import React from 'react';
import styles from '../../styles/ai-assistant.module.css';
import { HelpCircle, Sparkles, ShoppingBag, Package, TrendingDown, DollarSign, FileText } from 'lucide-react';

interface FallbackAnswerProps {
  onSelectPrompt: (prompt: string) => void;
}

export const FallbackAnswer: React.FC<FallbackAnswerProps> = ({ onSelectPrompt }) => {
  const samplePrompts = [
    { label: "Today's sales summary", icon: ShoppingBag, query: "Today's sales summary" },
    { label: 'Which products are low in stock?', icon: Package, query: 'Which products are low in stock?' },
    { label: 'Reorder suggestions for next 14 days', icon: Sparkles, query: 'Reorder suggestions' },
    { label: 'Which customers are at risk of churning?', icon: TrendingDown, query: 'Which customers are at risk of churning?' },
    { label: 'Biggest expenses this month', icon: DollarSign, query: 'Biggest expenses this month' },
    { label: 'Any unpaid or overdue invoices?', icon: FileText, query: 'Any unpaid or overdue invoices?' },
    { label: 'How to add a new product', icon: HelpCircle, query: 'How do I add a product?' },
    { label: 'How to process returns', icon: HelpCircle, query: 'How to process a return and refund?' }
  ];

  return (
    <div className={styles.answerCard} style={{ borderLeft: '4px solid var(--color-primary)' }}>
      <div className={styles.answerCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.answerIntentBadge}>Business Assistant Capabilities</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>Grounded ERP Analyst</span>
      </div>

      <div className={styles.answerSummaryText}>
        I am your constrained business analyst grounded in your live store data across POS, inventory, orders, customer
        churn, finance, and operating procedures. I didn't recognize that exact query, but you can try asking one of the
        following questions:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-muted-text)' }}>
          Suggested Inquiries
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          {samplePrompts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                className={styles.promptChip}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', width: '100%' }}
                onClick={() => onSelectPrompt(item.query)}
              >
                <Icon size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span style={{ textAlign: 'left' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.answerCardFooter}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
          Tip: You can also look up any specific order by entering its ID (e.g. <code>ORD-1042</code> or <code>#101</code>)
        </span>
      </div>
    </div>
  );
};
