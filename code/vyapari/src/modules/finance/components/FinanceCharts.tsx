import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { formatINR } from '../../../utils/format';
import styles from '../styles/finance.module.css';

export interface TimelineDataPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

interface FinanceChartsProps {
  timelineData: TimelineDataPoint[];
  categoryData: CategoryDataPoint[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#5B7A8C',
  Utilities: '#E3A857',
  Salaries: '#8C5B7A',
  Inventory: '#C65D3A',
  Logistics: '#5B8C7A',
  Marketing: '#8C7A5B',
  Miscellaneous: '#7A7A7A'
};

export const FinanceCharts: React.FC<FinanceChartsProps> = ({
  timelineData,
  categoryData
}) => {
  const [chartType, setChartType] = useState<'groupedBar' | 'profitLine'>('groupedBar');

  const hasTimelineData = timelineData.length > 0 && timelineData.some(d => d.revenue > 0 || d.expenses > 0);
  const totalCategoryExpenses = categoryData.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className={styles.chartsGrid}>
      {/* 1. Revenue & Expense / Profit Trend Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>
              {chartType === 'groupedBar' ? 'Revenue vs Expenses' : 'Net Profit Trend'}
            </h3>
            <div className={styles.chartSubtitle}>
              {chartType === 'groupedBar'
                ? 'Comparison of inflow credits vs operational debits'
                : 'Net earnings progression over selected period'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setChartType('groupedBar')}
              className={`${styles.presetBtn} ${chartType === 'groupedBar' ? styles.presetBtnActive : ''}`}
            >
              Revenue vs Expenses
            </button>
            <button
              onClick={() => setChartType('profitLine')}
              className={`${styles.presetBtn} ${chartType === 'profitLine' ? styles.presetBtnActive : ''}`}
            >
              Profit Trend
            </button>
          </div>
        </div>

        <div style={{ height: 320, width: '100%' }}>
          {!hasTimelineData ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted-text)', fontSize: 13 }}>
              No transactions recorded for this selected time window.
            </div>
          ) : chartType === 'groupedBar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                  tickFormatter={val => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), '']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-md)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 12
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--color-danger)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-text)' }}
                  tickFormatter={val => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Net Profit']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-md)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 12
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-primary)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Expense Category Breakdown Donut */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Expense Breakdown</h3>
            <div className={styles.chartSubtitle}>Distribution across 7 standard categories</div>
          </div>
        </div>

        <div style={{ height: 320, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {totalCategoryExpenses === 0 ? (
            <div style={{ color: 'var(--color-muted-text)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              No expenses recorded in this period.
            </div>
          ) : (
            <>
              <div style={{ height: 210, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${formatINR(Number(val))} (${((Number(val) / totalCategoryExpenses) * 100).toFixed(1)}%)`,
                        name
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-md)',
                        backgroundColor: 'var(--color-surface)',
                        fontSize: 12
                      }}
                    />
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.name] || '#8884d8'}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clean category legend chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 12px',
                  justifyContent: 'center',
                  fontSize: 11,
                  marginTop: 8
                }}
              >
                {categoryData.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: CATEGORY_COLORS[cat.name] || '#8884d8',
                        display: 'inline-block'
                      }}
                    />
                    <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{cat.name}</span>
                    <span style={{ color: 'var(--color-muted-text)' }}>
                      ({((cat.value / totalCategoryExpenses) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
