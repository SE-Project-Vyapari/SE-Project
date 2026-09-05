import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../services/store';
import { mockApi } from '../../services/mockApi';
import { classifyQuery, type AssistantIntentType } from './services/queryRouter';
import { TodaySalesAnswer } from './components/answers/TodaySalesAnswer';
import { LowStockAnswer } from './components/answers/LowStockAnswer';
import { ReorderSuggestionsAnswer } from './components/answers/ReorderSuggestionsAnswer';
import { OrderStatusAnswer } from './components/answers/OrderStatusAnswer';
import { AtRiskCustomersAnswer } from './components/answers/AtRiskCustomersAnswer';
import { BiggestExpensesAnswer } from './components/answers/BiggestExpensesAnswer';
import { UnpaidInvoicesAnswer } from './components/answers/UnpaidInvoicesAnswer';
import { FaqAnswer } from './components/answers/FaqAnswer';
import { FallbackAnswer } from './components/answers/FallbackAnswer';
import { QueryLogDrawer } from './components/QueryLogDrawer';
import styles from './styles/ai-assistant.module.css';
import {
  Sparkles,
  Search,
  X,
  History,
  Trash2,
  HelpCircle,
  Package,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface AnswerItem {
  id: string;
  query: string;
  intent: AssistantIntentType;
  confidence: number;
  params: {
    orderId?: string;
    productQuery?: string;
  };
  resolved: boolean;
  timestamp: string;
}

export const AiAssistantPage: React.FC = () => {
  const [queryInput, setQueryInput] = useState('');
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store access
  const state = useStore();
  const { products, inventoryRecords, invoices, churnScores } = state;

  // Initialize with a welcome / daily summary card on first mount
  useEffect(() => {
    if (answers.length === 0) {
      const initialItem: AnswerItem = {
        id: 'initial-welcome-query',
        query: "Today's sales summary",
        intent: 'sales_summary',
        confidence: 1.0,
        params: {},
        resolved: true,
        timestamp: new Date().toISOString()
      };
      setAnswers([initialItem]);
    }
  }, []);

  // Compute dynamic contextual chips based on real-time business health
  const contextualChips = useMemo(() => {
    const chips: { label: string; query: string; isPriority?: boolean; icon: React.FC<any> }[] = [];

    // 1. Check for Low Stock
    const hasLowStock = products.some(p => {
      const stock = inventoryRecords
        .filter(r => r.productId === p.id)
        .reduce((sum, r) => sum + r.quantity, 0);
      return stock <= 10;
    });

    if (hasLowStock) {
      chips.push({
        label: 'Low stock alerts',
        query: 'Which products are low in stock?',
        isPriority: true,
        icon: Package
      });
    }

    // 2. Check for Overdue Invoices
    const hasOverdueInvoices = invoices.some(
      inv => inv.status === 'overdue' || (inv.status === 'unpaid' && inv.amount > 0)
    );

    if (hasOverdueInvoices) {
      chips.push({
        label: 'Overdue invoices',
        query: 'Any unpaid or overdue invoices?',
        isPriority: true,
        icon: FileText
      });
    }

    // 3. Check for High Churn Risk
    const hasChurnRisk = churnScores.some(c => c.riskLevel === 'high');
    if (hasChurnRisk) {
      chips.push({
        label: 'At-risk churn accounts',
        query: 'Which customers are at risk of churning?',
        isPriority: true,
        icon: TrendingDown
      });
    }

    // Standard business prompts
    chips.push(
      {
        label: "Today's sales summary",
        query: "Today's sales summary",
        icon: ShoppingBag
      },
      {
        label: '14-Day Reorder Forecast',
        query: 'Reorder suggestions for next 14 days',
        icon: Sparkles
      },
      {
        label: 'Biggest monthly expenses',
        query: 'What are our biggest expenses this month?',
        icon: DollarSign
      },
      {
        label: 'How to add a product',
        query: 'How do I add a new product to inventory?',
        icon: HelpCircle
      },
      {
        label: 'How to process returns',
        query: 'How do I process a customer return and refund?',
        icon: HelpCircle
      },
      {
        label: 'How to run payroll',
        query: 'How do I calculate and run monthly payroll?',
        icon: HelpCircle
      }
    );

    return chips;
  }, [products, inventoryRecords, invoices, churnScores]);

  // Handle Query Submission
  const handleExecuteQuery = (textToRun?: string) => {
    const query = (textToRun !== undefined ? textToRun : queryInput).trim();
    if (!query) return;

    // Pattern classify query
    const routeResult = classifyQuery(query, state);

    // Create Answer Item
    const newAnswer: AnswerItem = {
      id: `ans-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      query,
      intent: routeResult.intent,
      confidence: routeResult.confidence,
      params: routeResult.extractedParams,
      resolved: routeResult.resolved,
      timestamp: new Date().toISOString()
    };

    // Log Query into system store for evaluation and audit
    let responseSummary = `Processed ${routeResult.intent} (confidence: ${(routeResult.confidence * 100).toFixed(0)}%)`;
    if (!routeResult.resolved) {
      responseSummary = 'Unrecognized prompt - presented capability guide';
    }

    mockApi.logChatbotQuery(
      query,
      routeResult.intent,
      responseSummary,
      routeResult.resolved,
      routeResult.extractedParams
    );

    // Prepend to answer feed so newest answers appear at top
    setAnswers(prev => [newAnswer, ...prev]);
    setQueryInput('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteQuery();
  };

  const handleClearFeed = () => {
    setAnswers([]);
  };

  const renderAnswerContent = (item: AnswerItem) => {
    switch (item.intent) {
      case 'sales_summary':
        return <TodaySalesAnswer />;
      case 'low_stock':
        return <LowStockAnswer />;
      case 'reorder_suggestions':
        return <ReorderSuggestionsAnswer />;
      case 'order_status':
        return <OrderStatusAnswer orderId={item.params.orderId} />;
      case 'at_risk_customers':
        return <AtRiskCustomersAnswer />;
      case 'biggest_expenses':
        return <BiggestExpensesAnswer />;
      case 'unpaid_invoices':
        return <UnpaidInvoicesAnswer />;
      case 'faq_add_product':
      case 'faq_return_refund':
      case 'faq_payroll':
      case 'faq_stock_transfer':
      case 'faq_gst_invoice':
        return <FaqAnswer intent={item.intent} />;
      case 'unknown_fallback':
      default:
        return <FallbackAnswer onSelectPrompt={prompt => handleExecuteQuery(prompt)} />;
    }
  };

  return (
    <div className={styles.assistantContainer}>
      {/* Header Section */}
      <div className={styles.headerRow}>
        <div className={styles.headerTitleBlock}>
          <div className={styles.headerTitle}>
            <Sparkles size={26} style={{ color: 'var(--color-primary)' }} />
            <span>AI Business Assistant</span>
          </div>
          <div className={styles.headerSubtitle}>
            Constrained business intelligence analyst grounded in your live POS, inventory, orders, customer churn, and financial ledger data.
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setIsLogDrawerOpen(true)}
          >
            <History size={15} />
            Audit Query Logs
          </button>
          {answers.length > 0 && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleClearFeed}
            >
              <Trash2 size={15} />
              Clear Feed
            </button>
          )}
        </div>
      </div>

      {/* Query Search Panel */}
      <div className={styles.searchPanel}>
        <form className={styles.searchBarForm} onSubmit={handleFormSubmit}>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Ask anything about sales, low stock, order status, customer churn, expenses, or workflows..."
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              autoFocus
            />
            {queryInput && (
              <button
                type="button"
                className={styles.clearInputBtn}
                onClick={() => {
                  setQueryInput('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear Search Input"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="submit"
            className={styles.askButton}
            disabled={!queryInput.trim()}
          >
            <Sparkles size={16} />
            Ask Assistant
          </button>
        </form>

        {/* Suggested Prompt Chips */}
        <div className={styles.chipsSection}>
          <span className={styles.chipsLabel}>
            <Sparkles size={12} /> Suggested Business Inquiries:
          </span>
          <div className={styles.chipsGrid}>
            {contextualChips.map((chip, idx) => {
              const Icon = chip.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.promptChip} ${chip.isPriority ? styles.chipPriority : ''}`}
                  onClick={() => handleExecuteQuery(chip.query)}
                >
                  <Icon size={13} style={{ color: chip.isPriority ? 'var(--color-primary)' : 'inherit' }} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Answer Feed */}
      <div className={styles.feedContainer}>
        <div className={styles.feedHeader}>
          <div className={styles.feedTitle}>
            <Clock size={15} />
            Analyst Intelligence Feed ({answers.length} {answers.length === 1 ? 'Inquiry' : 'Inquiries'})
          </div>
          {answers.length > 0 && (
            <button
              type="button"
              className={styles.clearFeedBtn}
              onClick={handleClearFeed}
            >
              Reset feed
            </button>
          )}
        </div>

        {answers.length === 0 ? (
          <div className={styles.emptyStateContainer}>
            <Sparkles size={36} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
            <div className={styles.emptyStateTitle}>No Queries in Feed</div>
            <div className={styles.emptyStateText}>
              Select a suggested prompt chip above or type an inquiry to query your live retail & wholesale ERP database.
            </div>
          </div>
        ) : (
          answers.map(item => {
            let formattedTime = '';
            try {
              formattedTime = format(new Date(item.timestamp), 'HH:mm:ss');
            } catch {
              formattedTime = '';
            }

            return (
              <div key={item.id} className={styles.answerBlock}>
                {/* Triggering query small label above structured answer */}
                <div className={styles.queryHeaderTag}>
                  <div className={styles.queryLabel}>
                    <span>Inquiry:</span>
                    <span className={styles.queryString}>"{item.query}"</span>
                  </div>
                  {formattedTime && (
                    <span style={{ color: 'var(--color-muted-text)', fontSize: 11 }}>
                      {formattedTime}
                    </span>
                  )}
                </div>

                {/* Structured Data Answer Component */}
                {renderAnswerContent(item)}
              </div>
            );
          })
        )}
      </div>

      {/* Query Evaluation Audit Drawer */}
      <QueryLogDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
      />
    </div>
  );
};
