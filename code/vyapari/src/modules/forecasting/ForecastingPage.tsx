import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../services/store';
import { PredictionBadge } from '../../components/ui/PredictionBadge';
import { DemandForecastTab } from './components/DemandForecastTab';
import { CashFlowForecastTab } from './components/CashFlowForecastTab';
import { ForecastVsActualTab } from './components/ForecastVsActualTab';
import styles from './styles/forecasting.module.css';
import {
  TrendingUp,
  DollarSign,
  Target,
  Download,
  HelpCircle,
  X,
  Sparkles
} from 'lucide-react';

type ForecastingTabType = 'demand' | 'cashflow' | 'tracking';

export const ForecastingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as ForecastingTabType) || 'demand';

  const setActiveTab = (tab: ForecastingTabType) => {
    setSearchParams(prev => {
      const updated = new URLSearchParams(prev);
      updated.set('tab', tab);
      return updated;
    });
  };

  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  const products = useStore(state => state.products);
  const sales = useStore(state => state.sales);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Vyapari Forecasting & Predictive Intelligence Export - ${activeTab.toUpperCase()}\n`;
    csvContent += `Generated At: ${new Date().toISOString()}\n\n`;

    if (activeTab === 'demand') {
      csvContent += 'Product ID,Name,SKU,Category,Price,Cost\n';
      products.forEach(p => {
        csvContent += `"${p.id}","${p.name}","${p.sku}","${p.category}",${p.price},${p.cost}\n`;
      });
    } else {
      csvContent += 'Sale ID,Order ID,Outlet ID,Amount,Created At\n';
      sales.forEach(s => {
        csvContent += `"${s.id}","${s.orderId}","${s.outletId}",${s.total},"${s.createdAt}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vyapari_forecast_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.forecastingContainer}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerTitleBlock}>
          <div className={styles.headerTitle}>
            <span>Demand & Cash-Flow Forecasting</span>
            <PredictionBadge variant="prediction" />
          </div>
          <p className={styles.headerSubtitle}>
            Statistical run-rate demand predictions, safety-buffered reorder guidance, and cash-flow shortfall warnings (Advisory Only)
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setShowHowItWorks(true)}
          >
            <HelpCircle size={15} style={{ color: 'var(--color-primary)' }} />
            <span>How This Works</span>
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={handleExportCSV}
          >
            <Download size={15} />
            <span>Export Forecast (CSV)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'demand' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('demand')}
        >
          <TrendingUp size={16} />
          <span>Demand & Reorder Suggestions</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'cashflow' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('cashflow')}
        >
          <DollarSign size={16} />
          <span>Cash-Flow Projections</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'tracking' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          <Target size={16} />
          <span>Forecast vs Actual Tracking</span>
        </button>
      </div>

      {/* Tab Content Rendering */}
      {activeTab === 'demand' && (
        <DemandForecastTab selectedOutlet={selectedOutlet} onOutletChange={setSelectedOutlet} />
      )}
      {activeTab === 'cashflow' && (
        <CashFlowForecastTab selectedOutlet={selectedOutlet} />
      )}
      {activeTab === 'tracking' && (
        <ForecastVsActualTab selectedOutlet={selectedOutlet} />
      )}

      {/* "How This Works" Explanatory Modal */}
      {showHowItWorks && (
        <div className={styles.drawerOverlay} onClick={() => setShowHowItWorks(false)}>
          <div className={styles.drawerContent} style={{ width: 620 }} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-dark)' }}>
                  How Vyapari Forecasting Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-text)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Methodology Explanation */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--color-dark)' }}>
                  1. Transparent Statistical Demand Modeling
                </h4>
                <p style={{ fontSize: 13, color: 'var(--color-muted-text)', lineHeight: 1.5 }}>
                  Rather than black-box models, Vyapari uses a robust, industry-standard <strong>Exponentially Weighted Moving Average (EWMA)</strong> and daily sales velocity run-rate (v̄). Historical daily point-of-sale volume across all outlets is evaluated over your rolling sales timeline.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--color-dark)' }}>
                  2. Reorder Recommendation Formula
                </h4>
                <div className={styles.mathCallout}>
                  <div className={styles.mathRow}>
                    <span>Forecast Demand (D):</span>
                    <strong>v̄ × Horizon Days</strong>
                  </div>
                  <div className={styles.mathRow}>
                    <span>Safety Lead Buffer (B):</span>
                    <strong>max(5, ceil(D × 0.20)) (20% safety stock)</strong>
                  </div>
                  <div className={styles.mathRow}>
                    <span>Current Inventory (S):</span>
                    <strong>On-hand physical stock across outlets</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)', fontWeight: 700 }}>
                    <span>Recommended Reorder:</span>
                    <span>max(0, D - S + B)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--color-dark)' }}>
                  3. Transparent Confidence Scoring
                </h4>
                <ul style={{ fontSize: 13, color: 'var(--color-muted-text)', paddingLeft: 20, lineHeight: 1.6 }}>
                  <li>
                    <strong style={{ color: 'var(--color-success)' }}>High Confidence:</strong> Backed by ≥20 historical days of sales checkout history with low daily variance (CV &lt; 0.9).
                  </li>
                  <li>
                    <strong style={{ color: '#B8863B' }}>Medium Confidence:</strong> Moderate history (8–19 data points) or normal consumer fluctuation.
                  </li>
                  <li>
                    <strong style={{ color: 'var(--color-danger)' }}>Low Confidence:</strong> Less than 8 sales days recorded or highly erratic sales spikes.
                  </li>
                </ul>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--color-dark)' }}>
                  4. Non-Binding Recommendations Policy
                </h4>
                <p style={{ fontSize: 13, color: 'var(--color-muted-text)', lineHeight: 1.5 }}>
                  Every number provided by this module is an advisory guideline. Clicking <strong>Accept</strong> or <strong>Dismiss</strong> logs your review for evaluation metrics and planning audits; it does <em>not</em> place automated purchase orders or move funds.
                </p>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                onClick={() => setShowHowItWorks(false)}
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
