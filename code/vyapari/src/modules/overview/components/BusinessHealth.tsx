import { useStore } from '../../../services/store';
import { TrendingUp, TrendingDown, CreditCard, IndianRupee, ShoppingBag, AlertTriangle, ChevronRight } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../../../utils/format';
import { getLowStockRecords, getOutstandingTotal } from '../../../services/selectors';

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

  // Compute Gross Profit from actual orderItem costs (matching Sales Analytics & Reports)
  const computeGrossProfit = (salesList: typeof store.sales) => {
    let cost = 0;
    let rev = 0;
    salesList.forEach(s => {
      rev += s.total;
      const items = store.orderItems.filter(oi => oi.orderId === s.orderId);
      items.forEach(oi => {
        const prod = store.products.find(p => p.id === oi.productId);
        cost += (prod?.cost || 0) * oi.quantity;
      });
    });
    return rev - cost;
  };
  const todayGP = computeGrossProfit(todaySales);
  const yestGP = computeGrossProfit(yestSales);
  const gpDelta = yestGP === 0 ? 100 : ((todayGP - yestGP) / yestGP) * 100;

  const lowStockCount = getLowStockRecords(store.inventoryRecords).length;
  const outstandings = getOutstandingTotal(store.invoices);

  const MetricCard = ({ title, value, delta, icon: Icon, onClick }: any) => {
    const content = (
      <>
        <div className="vy-kpi__head">
          <span className="vy-kpi__title" title={title}>{title}</span>
          <span className="vy-kpi__icon" aria-hidden="true"><Icon size={17} /></span>
        </div>
        <div className="vy-kpi__value" title={String(value)}>{value}</div>
        <div className="vy-kpi__foot">
          {delta !== undefined ? (
            <>
              <span className={`vy-kpi__delta ${delta >= 0 ? 'vy-kpi__delta--up' : 'vy-kpi__delta--down'}`}>
                {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)}%
              </span>
              <span>vs yesterday</span>
            </>
          ) : onClick ? (
            <span className="vy-kpi__link-hint">View details <ChevronRight size={13} /></span>
          ) : null}
        </div>
      </>
    );

    return onClick ? (
      <button type="button" className="vy-kpi vy-kpi--link" onClick={onClick} aria-label={`${title}: ${value}. View details`}>
        {content}
      </button>
    ) : (
      <div className="vy-kpi">{content}</div>
    );
  };

  return (
    <div className="vy-kpi-grid">
      <MetricCard title="Today's Revenue" value={formatINR(todayRev)} delta={revDelta} icon={IndianRupee} />
      <MetricCard title="Today's Orders" value={todayOrders} delta={orderDelta} icon={ShoppingBag} />
      <MetricCard title="Gross Profit" value={formatINR(todayGP)} delta={gpDelta} icon={TrendingUp} />
      <MetricCard title="Low Stock Items" value={lowStockCount} icon={AlertTriangle} onClick={() => navigate('/inventory')} />
      <MetricCard title="Outstanding Pay" value={formatINR(outstandings)} icon={CreditCard} onClick={() => navigate('/invoices')} />
    </div>
  );
};
