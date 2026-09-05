import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import { PredictionBadge } from '../../../components/ui/PredictionBadge';
import styles from '../styles/forecasting.module.css';
import {
  TrendingUp,
  AlertTriangle,
  PackageCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  selectedOutlet: string;
  onOutletChange: (outletId: string) => void;
}

export const DemandForecastTab: React.FC<Props> = ({ selectedOutlet, onOutletChange }) => {
  const navigate = useNavigate();
  const products = useStore(state => state.products);
  const orders = useStore(state => state.orders);
  const orderItems = useStore(state => state.orderItems);
  const inventoryRecords = useStore(state => state.inventoryRecords);
  const outlets = useStore(state => state.outlets);
  const auditEvents = useStore(state => state.auditEvents);

  const [horizonDays, setHorizonDays] = useState<number>(14);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeReviewProduct, setActiveReviewProduct] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Sufficient stock in transit');
  const [showRejectOptions, setShowRejectOptions] = useState<boolean>(false);

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Map of stock on hand per product
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryRecords.forEach(r => {
      if (selectedOutlet === 'all' || r.outletId === selectedOutlet) {
        map.set(r.productId, (map.get(r.productId) || 0) + r.quantity);
      }
    });
    return map;
  }, [inventoryRecords, selectedOutlet]);

  // Map of audit reviews by product ID
  const reviewAuditMap = useMemo(() => {
    const map = new Map<string, { action: 'accepted' | 'rejected'; timestamp: string; details: any }>();
    auditEvents.forEach(a => {
      if (a.entityType === 'forecast_suggestion') {
        try {
          const det = JSON.parse(a.details);
          map.set(a.entityId, {
            action: a.action === 'forecast_accepted' ? 'accepted' : 'rejected',
            timestamp: a.timestamp,
            details: det
          });
        } catch {
          // ignore parsing error
        }
      }
    });
    return map;
  }, [auditEvents]);

  // Order lookups for fast calculation
  const relevantOrderIds = useMemo(() => {
    return new Set(
      orders
        .filter(o => selectedOutlet === 'all' || o.outletId === selectedOutlet)
        .map(o => o.id)
    );
  }, [orders, selectedOutlet]);

  // Compute forecasts across all products
  const forecastData = useMemo(() => {
    // Map of daily sales by productId -> dayKey -> count
    const productDailyMap = new Map<string, Map<string, number>>();

    orderItems.forEach(item => {
      if (relevantOrderIds.has(item.orderId)) {
        const order = orders.find(o => o.id === item.orderId);
        if (order) {
          const dayKey = order.createdAt.split('T')[0];
          let daily = productDailyMap.get(item.productId);
          if (!daily) {
            daily = new Map<string, number>();
            productDailyMap.set(item.productId, daily);
          }
          daily.set(dayKey, (daily.get(dayKey) || 0) + item.quantity);
        }
      }
    });

    return products
      .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
      .map(product => {
        const daily = productDailyMap.get(product.id) || new Map<string, number>();
        const dailyValues = Array.from(daily.values());
        const daysWithSales = dailyValues.length;
        const currentStock = stockMap.get(product.id) || 0;

        const reviewRecord = reviewAuditMap.get(product.id);

        if (daysWithSales === 0) {
          return {
            product,
            currentStock,
            hasData: false,
            avgDailyVelocity: 0,
            forecastDemand: 0,
            safetyBuffer: 0,
            reorderQty: 0,
            confidence: 'low' as const,
            confidenceScore: 0.1,
            stockoutRisk: false,
            daysUntilStockout: 999,
            reviewRecord
          };
        }

        const totalSold = dailyValues.reduce((sum, v) => sum + v, 0);
        const avgDailyVelocity = totalSold / Math.max(14, daysWithSales);

        // Variance & CV
        const variance =
          dailyValues.reduce((sum, v) => sum + Math.pow(v - avgDailyVelocity, 2), 0) / Math.max(1, daysWithSales);
        const stdDev = Math.sqrt(variance);
        const cv = avgDailyVelocity > 0 ? stdDev / avgDailyVelocity : 99;

        let confidence: 'high' | 'medium' | 'low' = 'low';
        let confidenceScore = 0.35;
        if (daysWithSales >= 20 && cv < 0.9) {
          confidence = 'high';
          confidenceScore = 0.88;
        } else if (daysWithSales >= 8 && cv <= 1.6) {
          confidence = 'medium';
          confidenceScore = 0.65;
        }

        const forecastDemand = Math.round(avgDailyVelocity * horizonDays);
        const safetyBuffer = Math.max(5, Math.ceil(forecastDemand * 0.2));
        const reorderQty = Math.max(0, forecastDemand - currentStock + safetyBuffer);

        const stockoutRisk = currentStock < forecastDemand;
        const daysUntilStockout = avgDailyVelocity > 0 ? Math.round(currentStock / avgDailyVelocity) : 999;

        return {
          product,
          currentStock,
          hasData: true,
          avgDailyVelocity: Math.round(avgDailyVelocity * 10) / 10,
          forecastDemand,
          safetyBuffer,
          reorderQty,
          confidence,
          confidenceScore,
          stockoutRisk,
          daysUntilStockout,
          reviewRecord
        };
      })
      .sort((a, b) => {
        // Stockout risk items first, then highest reorder quantity
        if (a.stockoutRisk !== b.stockoutRisk) return a.stockoutRisk ? -1 : 1;
        return b.reorderQty - a.reorderQty;
      });
  }, [products, orders, orderItems, relevantOrderIds, stockMap, reviewAuditMap, selectedCategory, horizonDays]);

  // Aggregate Metrics
  const stockoutRiskCount = forecastData.filter(f => f.stockoutRisk).length;
  const totalReorderUnits = forecastData.reduce((sum, f) => sum + f.reorderQty, 0);
  const highConfidenceCount = forecastData.filter(f => f.confidence === 'high').length;
  const avgVelocity =
    forecastData.length > 0
      ? (forecastData.reduce((sum, f) => sum + f.avgDailyVelocity, 0) / forecastData.length).toFixed(1)
      : '0.0';

  // Handle Review Actions
  const handleAccept = (item: (typeof forecastData)[0]) => {
    mockApi.logForecastReview(item.product.id, 'accepted', item.reorderQty);
    setActiveReviewProduct(null);
  };

  const handleReject = (item: (typeof forecastData)[0]) => {
    mockApi.logForecastReview(item.product.id, 'rejected', item.reorderQty, rejectReason);
    setShowRejectOptions(false);
    setActiveReviewProduct(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      {/* 4 Summary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Stockout Risk SKUs</span>
            <AlertTriangle size={18} style={{ color: stockoutRiskCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }} />
          </div>
          <div
            className={styles.kpiValue}
            style={{ color: stockoutRiskCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
          >
            {stockoutRiskCount} SKUs
          </div>
          <div className={styles.kpiFooter}>
            <PredictionBadge variant="prediction" size="sm" />
            <span>Projected to exhaust stock within {horizonDays} days</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Suggested Reorder Volume</span>
            <PackageCheck size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className={styles.kpiValue}>{totalReorderUnits.toLocaleString('en-IN')} units</div>
          <div className={styles.kpiFooter}>
            <PredictionBadge variant="recommendation" size="sm" />
            <span>Includes 20% safety lead buffer</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>High-Confidence Models</span>
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>
            {highConfidenceCount} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-muted-text)' }}>/ {products.length}</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Backed by &ge;20 data points & low variance</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Catalog Avg Run Rate</span>
            <TrendingUp size={18} style={{ color: '#2F6C9F' }} />
          </div>
          <div className={styles.kpiValue}>{avgVelocity} units/day</div>
          <div className={styles.kpiFooter}>
            <span>14-day rolling daily consumption speed</span>
          </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className={styles.toolbarRow}>
        <div className={styles.toolbarGroup}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
            Forecast Horizon:
          </span>
          <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {[7, 14, 30].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setHorizonDays(days)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: horizonDays === days ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: horizonDays === days ? '#fff' : 'var(--color-text)',
                  transition: 'all 0.15s ease'
                }}
              >
                {days} Days
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', textTransform: 'uppercase', marginLeft: 12 }}>
            Outlet:
          </span>
          <select
            className={styles.toolbarSelect}
            value={selectedOutlet}
            onChange={e => onOutletChange(e.target.value)}
          >
            <option value="all">All Outlets (Consolidated)</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', textTransform: 'uppercase', marginLeft: 12 }}>
            Category:
          </span>
          <select
            className={styles.toolbarSelect}
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-muted-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
          <span>Recommendations are advisory suggestions. No automatic orders placed.</span>
        </div>
      </div>

      {/* Demand & Reorder Forecast Table */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className={styles.cardTitle}>Product Demand Predictions & Reorder Suggestions</h3>
              <PredictionBadge variant="prediction" />
            </div>
            <span className={styles.cardSubtitle}>
              Statistical projection for the next {horizonDays} days with on-hand buffer diagnostics
            </span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.forecastTable}>
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th className={styles.textRight}>Current Stock</th>
                <th className={styles.textRight}>Daily Velocity</th>
                <th className={styles.textRight}>Predicted Demand ({horizonDays}d)</th>
                <th className={styles.textRight}>Recommended Reorder</th>
                <th>Confidence Level</th>
                <th style={{ textAlign: 'center', width: 170 }}>Action / Status</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.map(item => {
                const confClass =
                  item.confidence === 'high'
                    ? styles.confidenceHigh
                    : item.confidence === 'medium'
                    ? styles.confidenceMedium
                    : styles.confidenceLow;

                return (
                  <tr key={item.product.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-dark)' }}>{item.product.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{item.product.sku}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.badgeInfo}`}>{item.product.category}</span>
                    </td>
                    <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 600 }}>
                      <span style={{ color: item.stockoutRisk ? 'var(--color-danger)' : 'inherit' }}>
                        {item.currentStock} units
                      </span>
                      {item.stockoutRisk && (
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--color-danger)', fontWeight: 700 }}>
                          ⚠️ Low Stock
                        </span>
                      )}
                    </td>
                    <td className={`${styles.textRight} tabular-nums`}>
                      {item.hasData ? `${item.avgDailyVelocity} / day` : '—'}
                    </td>
                    <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700 }}>
                      {item.hasData ? (
                        <span>{item.forecastDemand} units</span>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)', fontSize: 12 }}>No Sales History</span>
                      )}
                    </td>
                    <td className={`${styles.textRight} tabular-nums`}>
                      {item.reorderQty > 0 ? (
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          +{item.reorderQty} units
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Adequate Stock</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.confidenceBadge} ${confClass}`}>
                        {item.confidence === 'high' ? 'High Confidence' : item.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.reviewRecord ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {item.reviewRecord.action === 'accepted' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--color-success)',
                                background: '#EBF3EB',
                                padding: '3px 8px',
                                borderRadius: 4
                              }}
                            >
                              <CheckCircle2 size={12} /> Accepted
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--color-muted-text)',
                                background: '#EFEFEF',
                                padding: '3px 8px',
                                borderRadius: 4
                              }}
                            >
                              <XCircle size={12} /> Dismissed
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveReviewProduct(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-primary)',
                              fontSize: 11,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Details
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.actionButton}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => setActiveReviewProduct(item)}
                        >
                          Review Suggestion
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Suggestion Detail Drawer */}
      {activeReviewProduct && (
        <div className={styles.drawerOverlay} onClick={() => setActiveReviewProduct(null)}>
          <div className={styles.drawerContent} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-dark)' }}>
                  Demand & Reorder Recommendation
                </h3>
                <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                  {activeReviewProduct.product.name} ({activeReviewProduct.product.sku})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewProduct(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-text)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Product Quick Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
                    Current Stock On Hand
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                    {activeReviewProduct.currentStock} units
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-muted-text)', textTransform: 'uppercase' }}>
                    Daily Velocity Run-Rate
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                    {activeReviewProduct.avgDailyVelocity} units/day
                  </div>
                </div>
              </div>

              {/* Mathematical Breakdown Callout */}
              <div className={styles.mathCallout}>
                <div style={{ fontWeight: 700, color: 'var(--color-dark)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>How This Reorder Was Computed</span>
                </div>
                <div className={styles.mathRow}>
                  <span>Forecast Demand ({horizonDays} days × {activeReviewProduct.avgDailyVelocity}/day):</span>
                  <strong>{activeReviewProduct.forecastDemand} units</strong>
                </div>
                <div className={styles.mathRow}>
                  <span>Safety Buffer Stock (+20% lead-time buffer):</span>
                  <strong>+{activeReviewProduct.safetyBuffer} units</strong>
                </div>
                <div className={styles.mathRow}>
                  <span>Less Current Available Stock:</span>
                  <strong>-{activeReviewProduct.currentStock} units</strong>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)', fontWeight: 700, fontSize: 13 }}>
                  <span>Recommended Reorder Quantity:</span>
                  <span>{activeReviewProduct.reorderQty} units</span>
                </div>
              </div>

              {/* Advisory Disclaimer */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: 'rgba(198, 93, 58, 0.08)',
                  border: '1px solid rgba(198, 93, 58, 0.2)',
                  fontSize: 12,
                  color: 'var(--color-text)'
                }}
              >
                <strong>Advisory Note:</strong> Accepting this recommendation will log your decision for inventory planning evaluation. It will <em>not</em> automatically submit a purchase order.
              </div>

              {/* If already reviewed */}
              {activeReviewProduct.reviewRecord && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    background: activeReviewProduct.reviewRecord.action === 'accepted' ? '#EBF3EB' : '#EFEFEF',
                    border: '1px solid var(--color-border)',
                    fontSize: 12
                  }}
                >
                  <strong>Status:</strong> Already {activeReviewProduct.reviewRecord.action.toUpperCase()} on{' '}
                  {new Date(activeReviewProduct.reviewRecord.timestamp).toLocaleDateString()}.
                </div>
              )}

              {/* Reject Options dropdown */}
              {showRejectOptions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#FDF3F2', borderRadius: 6, border: '1px solid #F5C6CB' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#721C24' }}>Reason for Dismissing:</label>
                  <select
                    className={styles.toolbarSelect}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  >
                    <option value="Sufficient stock in transit">Sufficient stock in transit</option>
                    <option value="Supplier lead time delay">Supplier lead time delay</option>
                    <option value="Seasonal decline expected">Seasonal decline expected</option>
                    <option value="Product discontinuation planned">Product discontinuation planned</option>
                    <option value="Other">Other operational reason</option>
                  </select>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                      style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      onClick={() => handleReject(activeReviewProduct)}
                    >
                      Confirm Dismissal
                    </button>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => setShowRejectOptions(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  navigate(`/inventory/${activeReviewProduct.product.id}`);
                }}
              >
                View Product Details <ArrowUpRight size={14} />
              </button>

              {!showRejectOptions && (
                <>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setShowRejectOptions(true)}
                  >
                    Dismiss
                  </button>

                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    onClick={() => handleAccept(activeReviewProduct)}
                  >
                    <CheckCircle2 size={14} /> Accept Suggestion
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
