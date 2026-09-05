import React from 'react';
import { useStore } from '../../../services/store';
import type { AnalyticsFilterState, ComparisonDateRanges } from '../types';
import styles from '../styles/analytics.module.css';
import { RotateCcw, Calendar, SlidersHorizontal } from 'lucide-react';

interface Props {
  filter: AnalyticsFilterState;
  onChange: (filter: AnalyticsFilterState) => void;
  dateRanges: ComparisonDateRanges;
}

export const AnalyticsFilterBar: React.FC<Props> = ({ filter, onChange, dateRanges }) => {
  const outlets = useStore(state => state.outlets);
  const products = useStore(state => state.products);

  // Derive unique categories from products
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products by selected category
  const filteredProducts = React.useMemo(() => {
    if (filter.categoryId === 'all') return products;
    return products.filter(p => p.category === filter.categoryId);
  }, [products, filter.categoryId]);

  const handlePresetChange = (preset: AnalyticsFilterState['preset']) => {
    onChange({
      ...filter,
      preset
    });
  };

  const handleReset = () => {
    onChange({
      preset: '30d',
      startDate: '',
      endDate: '',
      outletId: 'all',
      categoryId: 'all',
      productId: 'all',
      comparePrior: true
    });
  };

  return (
    <div className={styles.filterBarCard}>
      <div className={styles.filterControlsRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 600, fontSize: 13, marginRight: 4 }}>
          <SlidersHorizontal size={16} />
          <span>Filters:</span>
        </div>

        {/* Date Preset */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Date Range</label>
          <select
            className={styles.filterSelect}
            value={filter.preset}
            onChange={e => handlePresetChange(e.target.value as any)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Start & End Date Inputs */}
        {filter.preset === 'custom' && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Custom Period</label>
            <div className={styles.customDateInputs}>
              <input
                type="date"
                className={styles.filterInput}
                value={filter.startDate}
                onChange={e => onChange({ ...filter, startDate: e.target.value })}
                placeholder="Start Date"
              />
              <span style={{ color: 'var(--color-muted-text)' }}>to</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filter.endDate}
                onChange={e => onChange({ ...filter, endDate: e.target.value })}
                placeholder="End Date"
              />
            </div>
          </div>
        )}

        {/* Outlet Selector */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Outlet</label>
          <select
            className={styles.filterSelect}
            value={filter.outletId}
            onChange={e => onChange({ ...filter, outletId: e.target.value })}
          >
            <option value="all">All Outlets</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Category</label>
          <select
            className={styles.filterSelect}
            value={filter.categoryId}
            onChange={e => {
              const newCat = e.target.value;
              onChange({
                ...filter,
                categoryId: newCat,
                productId: 'all' // Reset product if category changes
              });
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Product Selector */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Product</label>
          <select
            className={styles.filterSelect}
            value={filter.productId}
            onChange={e => onChange({ ...filter, productId: e.target.value })}
            style={{ maxWidth: 220 }}
          >
            <option value="all">All Products</option>
            {filteredProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Action */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            <RotateCcw size={12} style={{ display: 'inline', marginRight: 4 }} />
            Reset
          </button>
        </div>
      </div>

      {/* Meta Row with Active Ranges & Comparison Indicator */}
      <div className={styles.filterMetaRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className={styles.comparisonBadge}>
            <Calendar size={13} />
            <span>
              <strong>Active Window:</strong> {dateRanges.current.label} ({dateRanges.durationDays} {dateRanges.durationDays === 1 ? 'day' : 'days'})
            </span>
          </div>

          {filter.comparePrior && (
            <div style={{ color: 'var(--color-muted-text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>vs</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                Prior {dateRanges.durationDays} Days ({dateRanges.prior.label})
              </span>
            </div>
          )}
        </div>

        <label className={styles.comparisonToggle}>
          <input
            type="checkbox"
            checked={filter.comparePrior}
            onChange={e => onChange({ ...filter, comparePrior: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
          />
          <span style={{ fontWeight: 500 }}>Compare with Prior Period</span>
        </label>
      </div>
    </div>
  );
};
