import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../services/store';
import { mockApi } from '../../services/mockApi';
import type { ChurnScore } from '../../types';
import { ChurnMetricsRow } from './components/ChurnMetricsRow';
import { ChurnReviewDrawer } from './components/ChurnReviewDrawer';
import {
  Search,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import styles from './styles/churn-insights.module.css';

export const ChurnInsightsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useStore();
  const { churnScores, customers, products, inventoryRecords, outlets } = store;

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>(searchParams.get('filter') || 'all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'revenue' | 'overdue'>('score');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected item for drawer
  const [selectedScore, setSelectedScore] = useState<ChurnScore | null>(null);

  // Synchronize risk filter with URL search params if present
  useEffect(() => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter === 'high-risk') {
      setRiskFilter('high');
    } else if (urlFilter) {
      setRiskFilter(urlFilter);
    }
  }, [searchParams]);

  // Compute or refresh all scores on mount if none exist
  useEffect(() => {
    if (churnScores.length === 0) {
      mockApi.computeAllChurnScores().catch(err => {
        console.error('Failed to compute churn scores:', err);
      });
    }
  }, [churnScores.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mockApi.computeAllChurnScores();
    } catch (err: any) {
      alert(err.message || 'Failed to recompute scores');
    } finally {
      setIsRefreshing(false);
    }
  };

  // High-level KPI aggregations
  const metrics = useMemo(() => {
    let high = 0;
    let medium = 0;
    let positive = 0;
    let revenue = 0;

    churnScores.forEach(score => {
      if (score.riskLevel === 'high') {
        high += 1;
        revenue += score.revenueAtRisk || 0;
      } else if (score.riskLevel === 'medium') {
        medium += 1;
        revenue += score.revenueAtRisk || 0;
      } else if (score.riskLevel === 'low') {
        positive += 1;
      }
    });

    return {
      high,
      medium,
      positive,
      revenue
    };
  }, [churnScores]);

  // Filtered and sorted scores
  const filteredScores = useMemo(() => {
    return churnScores
      .filter(score => {
        const customer = customers.find(c => c.id === score.customerId);
        const product = products.find(p => p.id === score.productId);

        // 1. Text search
        if (search) {
          const q = search.toLowerCase();
          const matchCustomer = customer ? customer.name.toLowerCase().includes(q) : false;
          const matchProduct = product ? product.name.toLowerCase().includes(q) : false;
          if (!matchCustomer && !matchProduct) return false;
        }

        // 2. Risk filter
        if (riskFilter === 'high' && score.riskLevel !== 'high') return false;
        if (riskFilter === 'medium' && score.riskLevel !== 'medium') return false;
        if (riskFilter === 'low' && score.riskLevel !== 'low') return false;
        if (riskFilter === 'insufficient' && score.status !== 'insufficient_history') return false;
        if (riskFilter === 'unreviewed' && (score.reviewed || score.riskLevel === 'low')) return false;

        // 3. Product filter
        if (productFilter !== 'all' && score.productId !== productFilter) return false;

        // 4. Customer segment filter
        if (segmentFilter !== 'all' && (customer?.type || 'retail') !== segmentFilter) return false;

        // 5. Outlet filter
        if (outletFilter !== 'all') {
          const hasOutletOrder = store.orders.some(o => o.customerId === score.customerId && o.outletId === outletFilter);
          if (!hasOutletOrder) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          return b.score - a.score;
        } else if (sortBy === 'revenue') {
          return (b.revenueAtRisk || 0) - (a.revenueAtRisk || 0);
        } else if (sortBy === 'overdue') {
          return (b.daysOverdue || 0) - (a.daysOverdue || 0);
        }
        return 0;
      });
  }, [churnScores, customers, products, search, riskFilter, productFilter, segmentFilter, sortBy]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className={styles.title}>Customer Churn Intelligence</h1>
            <span className={styles.predictionTag}>
              <Sparkles size={11} style={{ marginRight: 4 }} /> Predictive Model
            </span>
          </div>
          <p className={styles.subtitle}>
            Transparent RFM-based repurchase interval tracking to identify at-risk customer relationships early.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 16px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text)'
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Recomputing...' : 'Recompute Scores'}
        </button>
      </div>

      {/* Metrics Summary Row */}
      <ChurnMetricsRow
        highRiskCount={metrics.high}
        mediumRiskCount={metrics.medium}
        positiveTrendCount={metrics.positive}
        revenueAtRisk={metrics.revenue}
        onSelectRiskFilter={filter => {
          setRiskFilter(filter);
          setSearchParams({ filter });
        }}
      />

      {/* Filter and Search Panel */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup} style={{ flex: '2 1 240px' }}>
          <label htmlFor="churnSearch">Search</label>
          <div style={{ position: 'relative' }}>
            <input
              id="churnSearch"
              type="text"
              placeholder="Search by customer or product..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.inputField}
              style={{ paddingLeft: 34 }}
            />
            <Search
              size={16}
              color="var(--color-muted-text)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="riskFilter">Risk Level</label>
          <select
            id="riskFilter"
            value={riskFilter}
            onChange={e => {
              setRiskFilter(e.target.value);
              setSearchParams(e.target.value !== 'all' ? { filter: e.target.value } : {});
            }}
            className={styles.selectField}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk (&gt;70%)</option>
            <option value="medium">Medium Risk (35-70%)</option>
            <option value="low">Low Risk (&lt;35%)</option>
            <option value="insufficient">Not Enough History</option>
            <option value="unreviewed">Needs Attention (Unreviewed)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="productFilter">Product</label>
          <select
            id="productFilter"
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="segmentFilter">Customer Segment</label>
          <select
            id="segmentFilter"
            value={segmentFilter}
            onChange={e => setSegmentFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Segments</option>
            <option value="retail">Retail (B2C)</option>
            <option value="wholesale">Wholesale (B2B)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="outletFilter">Outlet</label>
          <select
            id="outletFilter"
            value={outletFilter}
            onChange={e => setOutletFilter(e.target.value)}
            className={styles.selectField}
          >
            <option value="all">All Outlets</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="sortFilter">Sort By</label>
          <select
            id="sortFilter"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className={styles.selectField}
          >
            <option value="score">Churn Probability (High to Low)</option>
            <option value="revenue">Revenue at Risk (High to Low)</option>
            <option value="overdue">Days Overdue (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Risk Table */}
      <div className={styles.tableCard}>
        {filteredScores.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-muted-text)' }}>
            No customer-product churn records match your active filters.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Churn Risk</th>
                <th>Days Since Last</th>
                <th>Typical Interval</th>
                <th>Days Overdue</th>
                <th>Suggested Action</th>
                <th style={{ textAlign: 'right' }}>Review</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.map(score => {
                const customer = customers.find(c => c.id === score.customerId);
                const product = products.find(p => p.id === score.productId);
                const inventory = inventoryRecords.find(i => i.productId === score.productId);
                const isOutOfStock = inventory ? inventory.quantity <= 0 : false;

                let riskBadgeClass = styles.badgeLow;
                let riskLabel = 'Low';
                if (score.status === 'insufficient_history') {
                  riskBadgeClass = styles.badgeInsufficient;
                  riskLabel = 'History Needed';
                } else if (score.riskLevel === 'high') {
                  riskBadgeClass = styles.badgeHigh;
                  riskLabel = 'High';
                } else if (score.riskLevel === 'medium') {
                  riskBadgeClass = styles.badgeMedium;
                  riskLabel = 'Medium';
                }

                return (
                  <tr key={score.id} className={styles.tableRow}>
                    {/* Customer */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-dark)' }}>
                        {customer?.name || 'Unknown Customer'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 2 }}>
                        {customer?.phone || customer?.email || '—'} •{' '}
                        <span style={{ textTransform: 'capitalize' }}>{customer?.type || 'Retail'}</span>
                      </div>
                    </td>

                    {/* Product */}
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {product?.name || 'Unknown Product'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>
                        {product?.category || 'General'}
                      </div>
                      {isOutOfStock && (
                        <div className={styles.stockBadge}>
                          <AlertTriangle size={11} /> Out of Stock
                        </div>
                      )}
                    </td>

                    {/* Churn Probability */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={`${styles.badge} ${riskBadgeClass}`}>
                          {riskLabel} {score.score}%
                        </span>
                        <span className={styles.predictionTag}>
                          Prediction
                        </span>
                      </div>
                      {score.revenueAtRisk ? (
                        <div style={{ fontSize: 11, color: 'var(--color-muted-text)', marginTop: 4 }}>
                          At risk: <strong className="tabular-nums">₹{score.revenueAtRisk.toLocaleString('en-IN')}</strong>
                        </div>
                      ) : null}
                    </td>

                    {/* Days Since Last Purchase */}
                    <td>
                      {score.daysSinceLastPurchase !== undefined && score.daysSinceLastPurchase !== 999
                        ? `${score.daysSinceLastPurchase} days ago`
                        : 'Never'}
                    </td>

                    {/* Normal Purchase Interval */}
                    <td>
                      {score.averageIntervalDays ? `~${score.averageIntervalDays} days` : '—'}
                    </td>

                    {/* Days Overdue */}
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: (score.daysOverdue || 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                        }}
                      >
                        {(score.daysOverdue || 0) > 0 ? `+${score.daysOverdue} days` : 'On track'}
                      </span>
                    </td>

                    {/* Suggested Action */}
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text)' }}>
                        {score.suggestedAction || 'Review relationship'}
                      </div>
                    </td>

                    {/* Review Button */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedScore(score)}
                        className={styles.reviewBtn}
                      >
                        Review <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Slide-over Drawer */}
      {selectedScore && (
        <ChurnReviewDrawer
          churnScore={selectedScore}
          customer={customers.find(c => c.id === selectedScore.customerId)}
          product={products.find(p => p.id === selectedScore.productId)}
          inventory={inventoryRecords.find(i => i.productId === selectedScore.productId)}
          onClose={() => setSelectedScore(null)}
          onScoreUpdated={updated => {
            setSelectedScore(updated);
          }}
        />
      )}
    </div>
  );
};
