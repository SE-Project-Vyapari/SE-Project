import { useStore } from '../../../services/store';
import { Card } from '../../../components/ui/Card';
import { TrendingUp, TrendingDown, Package, CreditCard, DollarSign } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../../../utils/format';

export const BusinessHealth = () => {
  const store = useStore();
  const navigate = useNavigate();
  
  // Computations
  const todaySales = store.sales.filter(s => isToday(new Date(s.createdAt)));
  const yestSales = store.sales.filter(s => isYesterday(new Date(s.createdAt)));
  
  const todayRev = todaySales.reduce((sum, s) => sum + s.total, 0);
  const yestRev = yestSales.reduce((sum, s) => sum + s.total, 0);
  const revDelta = yestRev === 0 ? 100 : ((todayRev - yestRev) / yestRev) * 100;

  const todayOrders = todaySales.length;
  const yestOrders = yestSales.length;
  const orderDelta = yestOrders === 0 ? 100 : ((todayOrders - yestOrders) / yestOrders) * 100;

  // Simplified Gross Profit (assuming flat 20% margin if cost isn't strictly linked, or sum item cost)
  const todayGP = todayRev * 0.2; // mock logic
  const yestGP = yestRev * 0.2;
  const gpDelta = yestGP === 0 ? 100 : ((todayGP - yestGP) / yestGP) * 100;

  const lowStockCount = store.inventoryRecords.filter(i => i.quantity <= i.reorderLevel && i.quantity > 0).length;
  const outstandings = store.invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);

  const MetricCard = ({ title, value, delta, icon: Icon, onClick }: any) => (
    <Card style={{ padding: 'var(--spacing-16)', flex: 1, cursor: onClick ? 'pointer' : 'default', borderLeft: onClick ? '3px solid var(--color-primary)' : 'none' }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-muted-text)', marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        <Icon size={16} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>{value}</div>
      {delta !== undefined && (
        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(delta).toFixed(1)}% vs yesterday</span>
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-16)', flexWrap: 'wrap' }}>
      <MetricCard title="Today's Revenue" value={formatINR(todayRev)} delta={revDelta} icon={DollarSign} />
      <MetricCard title="Today's Orders" value={todayOrders} delta={orderDelta} icon={Package} />
      <MetricCard title="Gross Profit" value={formatINR(todayGP)} delta={gpDelta} icon={TrendingUp} />
      <MetricCard title="Low Stock Items" value={lowStockCount} icon={Package} onClick={() => navigate('/inventory')} />
      <MetricCard title="Outstanding Pay" value={formatINR(outstandings)} icon={CreditCard} onClick={() => navigate('/invoices')} />
    </div>
  );
};
