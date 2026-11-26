import { useState, useMemo } from 'react';
import { useStore } from '../../../services/store';
import { Card } from '../../../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, isAfter, format } from 'date-fns';

export const SalesChart = () => {
  const store = useStore();
  const [range, setRange] = useState(7);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const data = useMemo(() => {
    const cutOff = subDays(new Date(), range);
    const recentSales = store.sales.filter(s => isAfter(new Date(s.createdAt), cutOff));
    
    // Group by date
    const grouped = recentSales.reduce((acc, sale) => {
      const d = format(new Date(sale.createdAt), 'MMM dd');
      if (!acc[d]) acc[d] = { date: d, revenue: 0, orders: 0 };
      acc[d].revenue += sale.total;
      acc[d].orders += 1;
      return acc;
    }, {} as Record<string, any>);

    // If sparse, ensure some empty days exist (simplified for mockup: just render grouped sorted)
    return Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [store.sales, range]);

  return (
    <Card style={{ padding: 'var(--spacing-24)' }}>
      <div className="vy-card-header">
        <h3 className="vy-card-title">Sales Trend</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select aria-label="Chart metric" className="vy-select vy-select--sm" value={metric} onChange={e => setMetric(e.target.value as any)} style={{ width: 'auto' }}>
            <option value="revenue">Revenue</option>
            <option value="orders">Orders</option>
          </select>
          <select aria-label="Date range" className="vy-select vy-select--sm" value={range} onChange={e => setRange(Number(e.target.value))} style={{ width: 'auto' }}>
            <option value={1}>Today</option>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </div>
      
      <div style={{ height: 300, width: '100%', minWidth: 0 }}>
        {data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted-text)' }}>
            No sales data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-text)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-text)' }} />
              <Tooltip cursor={{ stroke: 'var(--color-border-strong)', strokeDasharray: '4 4' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', fontSize: 13 }} />
              <Line type="monotone" dataKey={metric} stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--color-surface)' }} activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--color-surface)' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
