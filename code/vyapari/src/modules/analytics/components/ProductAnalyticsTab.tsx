import React, { useMemo, useState } from 'react';
import { useStore } from '../../../services/store';
import type { AnalyticsFilterState, ComparisonDateRanges } from '../types';
import {
  isDateInInterval,
  formatINR,
  formatCompactINR,
  formatNumber
} from '../utils/analyticsHelpers';
import styles from '../styles/analytics.module.css';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Package,
  Layers,
  AlertTriangle,
  Activity,
  Award,
  Sparkles
} from 'lucide-react';

interface Props {
  filter: AnalyticsFilterState;
  dateRanges: ComparisonDateRanges;
}

export const ProductAnalyticsTab: React.FC<Props> = ({ filter, dateRanges }) => {
  const products = useStore(state => state.products);
  const orderItems = useStore(state => state.orderItems);
  const orders = useStore(state => state.orders);
  const inventoryRecords = useStore(state => state.inventoryRecords);

  const [paretoVisible, setParetoVisible] = useState({
    revenue: true,
    cumulative: true
  });

  // Map of orders by ID for fast lookup
  const ordersMap = useMemo(() => {
    const map = new Map<string, (typeof orders)[0]>();
    orders.forEach(o => map.set(o.id, o));
    return map;
  }, [orders]);

  // Inventory on hand per product (across outlets or filtered outlet)
  const productStockMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryRecords.forEach(rec => {
      if (filter.outletId === 'all' || rec.outletId === filter.outletId) {
        const current = map.get(rec.productId) || 0;
        map.set(rec.productId, current + rec.quantity);
      }
    });
    return map;
  }, [inventoryRecords, filter.outletId]);

  // Comprehensive Product Performance Aggregator
  const {
    paretoData,
    bestSellers,
    slowMovers,
    categoryBreakdown,
    totalCatalogRevenue,
    activeSKUCount,
    deadStockValue
  } = useMemo(() => {
    // 1. Filter order items that match the active period & outlet & category/product filters
    const productSalesMap = new Map<
      string,
      { unitsSold: number; revenue: number; orderCount: number }
    >();

    orderItems.forEach(oi => {
      const order = ordersMap.get(oi.orderId);
      if (!order) return;

      if (isDateInInterval(order.createdAt, dateRanges.current.startDate, dateRanges.current.endDate)) {
        if (filter.outletId !== 'all' && order.outletId !== filter.outletId) return;

        const current = productSalesMap.get(oi.productId) || { unitsSold: 0, revenue: 0, orderCount: 0 };
        current.unitsSold += oi.quantity;
        current.revenue += oi.subtotal || oi.unitPrice * oi.quantity;
        current.orderCount += 1;
        productSalesMap.set(oi.productId, current);
      }
    });

    // 2. Iterate over ALL catalogue products (respecting category & product filter if selected)
    // This guarantees that products with 0 sales are NOT omitted silently!
    const allFilteredProducts = products.filter(p => {
      if (filter.categoryId !== 'all' && p.category !== filter.categoryId) return false;
      if (filter.productId !== 'all' && p.id !== filter.productId) return false;
      return true;
    });

    let totalRev = 0;
    let activeSKUs = 0;
    let deadStockCap = 0;

    const fullStats = allFilteredProducts.map(p => {
      const sales = productSalesMap.get(p.id) || { unitsSold: 0, revenue: 0, orderCount: 0 };
      const currentStock = productStockMap.get(p.id) || 0;
      const cogs = sales.unitsSold * (p.cost || 0);
      const grossProfit = Math.max(0, sales.revenue - cogs);
      const grossMargin = sales.revenue > 0 ? (grossProfit / sales.revenue) * 100 : 0;
      const holdingValue = currentStock * (p.cost || 0);

      // Turnover ratio: Units Sold / Current Stock (safe division)
      const turnoverRatio = currentStock > 0 ? sales.unitsSold / currentStock : sales.unitsSold > 0 ? 99 : 0;

      if (sales.revenue > 0) {
        totalRev += sales.revenue;
        activeSKUs += 1;
      } else {
        deadStockCap += holdingValue;
      }

      // Actionable recommendation for slow moving
      let recommendation = 'Normal Stock';
      let velocityStatus = 'Active Mover';

      if (sales.unitsSold === 0) {
        velocityStatus = 'Dead Stock (0 Sold)';
        if (currentStock > 20) {
          recommendation = 'Run 20% Clearance Sale';
        } else if (currentStock > 5) {
          recommendation = 'Bundle with Best-Seller';
        } else {
          recommendation = 'Transfer / Write-off';
        }
      } else if (turnoverRatio < 0.25) {
        velocityStatus = 'Slow Moving';
        recommendation = 'Offer 10% Volume Discount';
      } else if (turnoverRatio > 1.5) {
        velocityStatus = 'High Velocity';
        recommendation = 'Increase Reorder Buffer';
      }

      return {
        product: p,
        unitsSold: sales.unitsSold,
        revenue: sales.revenue,
        cogs,
        grossProfit,
        grossMargin,
        currentStock,
        holdingValue,
        turnoverRatio,
        velocityStatus,
        recommendation
      };
    });

    // 3. Compute Pareto Chart Data (sorted descending by revenue)
    const sortedByRevenue = [...fullStats].sort((a, b) => b.revenue - a.revenue);

    let runningSum = 0;
    const pareto = sortedByRevenue.map(item => {
      runningSum += item.revenue;
      const cumPct = totalRev > 0 ? (runningSum / totalRev) * 100 : 0;
      const sharePct = totalRev > 0 ? (item.revenue / totalRev) * 100 : 0;

      return {
        id: item.product.id,
        name: item.product.name.length > 16 ? item.product.name.substring(0, 14) + '...' : item.product.name,
        fullName: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        revenue: item.revenue,
        unitsSold: item.unitsSold,
        sharePct: Math.round(sharePct * 10) / 10,
        cumulativePct: Math.round(cumPct * 10) / 10
      };
    });

    // 4. Best-Sellers (Top performing products with revenue > 0)
    const best = sortedByRevenue.filter(item => item.revenue > 0);

    // 5. Slow Movers & Dead Stock (Sorted by lowest units sold and highest holding value)
    const slow = [...fullStats]
      .filter(item => item.unitsSold <= 2)
      .sort((a, b) => a.unitsSold - b.unitsSold || b.holdingValue - a.holdingValue);

    // 6. Category Breakdown
    const catMap = new Map<string, { category: string; revenue: number; unitsSold: number; skuCount: number }>();
    fullStats.forEach(item => {
      const cat = item.product.category || 'General';
      const existing = catMap.get(cat) || { category: cat, revenue: 0, unitsSold: 0, skuCount: 0 };
      existing.revenue += item.revenue;
      existing.unitsSold += item.unitsSold;
      existing.skuCount += 1;
      catMap.set(cat, existing);
    });

    const categories = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      productStats: fullStats,
      paretoData: pareto,
      bestSellers: best,
      slowMovers: slow,
      categoryBreakdown: categories,
      totalCatalogRevenue: totalRev,
      activeSKUCount: activeSKUs,
      deadStockValue: deadStockCap
    };
  }, [products, orderItems, ordersMap, productStockMap, filter, dateRanges]);

  // Custom Pareto Tooltip
  const CustomParetoTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipTitle}>{d.fullName}</div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>SKU / Cat:</span>
            <span className={styles.tooltipValue}>
              {d.sku} ({d.category})
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Revenue:</span>
            <span className={styles.tooltipValue}>{formatINR(d.revenue)}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Units Sold:</span>
            <span className={styles.tooltipValue}>{formatNumber(d.unitsSold)}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Revenue Share:</span>
            <span className={styles.tooltipValue}>{d.sharePct}%</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Cumulative %:</span>
            <span className={styles.tooltipValue} style={{ color: '#D99A6C' }}>
              {d.cumulativePct}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'N/A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      {/* 4 Summary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Active Catalog SKUs</span>
            <Package size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className={styles.kpiValue}>
            {activeSKUCount} <span style={{ fontSize: 14, color: 'var(--color-muted-text)', fontWeight: 400 }}>/ {products.length}</span>
          </div>
          <div className={styles.deltaSubtext}>
            {Math.round((activeSKUCount / Math.max(1, products.length)) * 100)}% of catalog active in period
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Top Category by Revenue</span>
            <Layers size={18} style={{ color: '#2F6C9F' }} />
          </div>
          <div className={styles.kpiValue} style={{ fontSize: 20 }}>
            {topCategory}
          </div>
          <div className={styles.deltaSubtext}>
            {categoryBreakdown.length > 0 ? formatINR(categoryBreakdown[0].revenue) : '₹0'} total sales
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Slow & Dead Stock Count</span>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-warning)' }}>
            {slowMovers.length} SKUs
          </div>
          <div className={styles.deltaSubtext}>Products with ≤ 2 units sold in period</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Stagnant Stock Value</span>
            <Activity size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--color-danger)' }}>
            {formatINR(deadStockValue)}
          </div>
          <div className={styles.deltaSubtext}>Unsold inventory capital holding at cost</div>
        </div>
      </div>

      {/* Pareto 80/20 Revenue Contribution Chart */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <h3 className={styles.cardTitle}>Pareto 80/20 Revenue Contribution Curve</h3>
            <span className={styles.cardSubtitle}>
              Individual product sales bars vs cumulative percentage curve demonstrating top-tier revenue drivers
            </span>
          </div>

          <div className={styles.legendToggleGroup}>
            <span
              className={`${styles.legendItem} ${
                paretoVisible.revenue ? styles.legendItemActive : styles.legendItemInactive
              }`}
              onClick={() => setParetoVisible(p => ({ ...p, revenue: !p.revenue }))}
            >
              <span className={styles.legendDot} style={{ background: 'var(--color-primary)' }} />
              Product Revenue (₹)
            </span>
            <span
              className={`${styles.legendItem} ${
                paretoVisible.cumulative ? styles.legendItemActive : styles.legendItemInactive
              }`}
              onClick={() => setParetoVisible(p => ({ ...p, cumulative: !p.cumulative }))}
            >
              <span className={styles.legendDot} style={{ background: '#D99A6C' }} />
              Cumulative % (Right)
            </span>
          </div>
        </div>

        <div style={{ height: 340, width: '100%', marginTop: 8 }}>
          {paretoData.length === 0 ? (
            <div className={styles.emptyStateContainer} style={{ height: '100%', border: 'none' }}>
              No product sales data available for Pareto analysis in this range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                {/* Left Y Axis for Revenue */}
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={val => formatCompactINR(val)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                {/* Right Y Axis for Cumulative % */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={val => `${val}%`}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                <Tooltip content={<CustomParetoTooltip />} />
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#B84A3E"
                  strokeDasharray="4 4"
                  label={{
                    value: '80% Revenue Cutoff',
                    position: 'insideTopRight',
                    fill: '#B84A3E',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />

                {paretoVisible.revenue && (
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                )}
                {paretoVisible.cumulative && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePct"
                    stroke="var(--color-secondary)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--color-secondary)' }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Best-Selling Products Table */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className={styles.cardTitle}>Best-Selling Products Ranking</h3>
            </div>
            <span className={styles.cardSubtitle}>
              Top revenue and volume generators with unit profitability and revenue contribution shares
            </span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.analyticsTable}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Product & SKU</th>
                <th>Category</th>
                <th className={styles.textRight}>Units Sold</th>
                <th className={styles.textRight}>Revenue</th>
                <th className={styles.textRight}>Gross Profit</th>
                <th className={styles.textRight}>Margin %</th>
                <th style={{ width: 160 }}>Revenue Share</th>
              </tr>
            </thead>
            <tbody>
              {bestSellers.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.textCenter} style={{ padding: 24, color: 'var(--color-muted-text)' }}>
                    No products sold in the selected filter window.
                  </td>
                </tr>
              ) : (
                bestSellers.map((item, idx) => {
                  const share = totalCatalogRevenue > 0 ? (item.revenue / totalCatalogRevenue) * 100 : 0;
                  return (
                    <tr key={item.product.id}>
                      <td style={{ fontWeight: 700, color: idx < 3 ? 'var(--color-primary)' : 'var(--color-muted-text)' }}>
                        #{idx + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-dark)' }}>{item.product.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{item.product.sku}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles.badgeInfo}`}>{item.product.category}</span>
                      </td>
                      <td className={`${styles.textRight} tabular-nums`}>{formatNumber(item.unitsSold)}</td>
                      <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 700 }}>
                        {formatINR(item.revenue)}
                      </td>
                      <td className={`${styles.textRight} tabular-nums`} style={{ color: 'var(--color-success)' }}>
                        {formatINR(item.grossProfit)}
                      </td>
                      <td className={`${styles.textRight} tabular-nums`}>{Math.round(item.grossMargin)}%</td>
                      <td>
                        <div className={styles.barContainer}>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {Math.round(share)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slow-Moving & Dead Stock Diagnostics Table */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
              <h3 className={styles.cardTitle}>Slow-Moving & Dead Stock Diagnostics</h3>
            </div>
            <span className={styles.cardSubtitle}>
              Comprehensive inventory velocity audit (Zero-sale products explicitly captured with capital at risk)
            </span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.analyticsTable}>
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th className={styles.textRight}>Current Stock</th>
                <th className={styles.textRight}>Holding Value (Cost)</th>
                <th className={styles.textRight}>Units Sold in Range</th>
                <th>Velocity Status</th>
                <th>Automated Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {slowMovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.textCenter} style={{ padding: 24, color: 'var(--color-success)' }}>
                    🎉 Excellent! All products have healthy turnover and volume in this window.
                  </td>
                </tr>
              ) : (
                slowMovers.map(item => (
                  <tr key={item.product.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{item.product.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>{item.product.sku}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.badgeInfo}`}>{item.product.category}</span>
                    </td>
                    <td className={`${styles.textRight} tabular-nums`} style={{ fontWeight: 600 }}>
                      {formatNumber(item.currentStock)} units
                    </td>
                    <td className={`${styles.textRight} tabular-nums`} style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                      {formatINR(item.holdingValue)}
                    </td>
                    <td className={`${styles.textRight} tabular-nums`}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: item.unitsSold === 0 ? 'var(--color-danger)' : 'var(--color-warning)'
                        }}
                      >
                        {item.unitsSold} units
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          item.unitsSold === 0 ? styles.badgeDanger : styles.badgeWarning
                        }`}
                      >
                        {item.velocityStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge}`}
                        style={{
                          background: 'rgba(198, 93, 58, 0.08)',
                          color: 'var(--color-primary)',
                          border: '1px solid rgba(198, 93, 58, 0.2)'
                        }}
                      >
                        <Sparkles size={11} style={{ marginRight: 4 }} />
                        {item.recommendation}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
