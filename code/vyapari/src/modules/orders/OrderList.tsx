import { useState, useMemo } from 'react';
import { useStore } from '../../services/store';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Plus, Search } from 'lucide-react';
import { CreateOrderModal } from './components/CreateOrderModal';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  pending: 'var(--color-warning)',
  confirmed: 'var(--color-info)',
  processing: 'var(--color-info)',
  ready: 'var(--color-primary)',
  completed: 'var(--color-success)',
  cancelled: 'var(--color-danger)',
  returned: 'var(--color-danger)'
};

export const OrderList = () => {
  const store = useStore();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [outletFilter, setOutletFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    return store.orders
      .filter(o => (statusFilter ? o.status === statusFilter : true))
      .filter(o => (outletFilter ? o.outletId === outletFilter : true))
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        const c = store.customers.find(c => c.id === o.customerId);
        return o.id.toLowerCase().includes(q) || (c && c.name.toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [store.orders, store.customers, search, statusFilter, outletFilter]);

  const columns = [
    { header: 'Order ID', accessor: (r: any) => (
      <a href={`/orders/${r.id}`} style={{ fontWeight: 600 }} onClick={(e) => { e.preventDefault(); navigate(`/orders/${r.id}`); }}>
        {r.id.toUpperCase()}
      </a>
    )},
    { header: 'Date', accessor: (r: any) => new Date(r.createdAt).toLocaleString() },
    { header: 'Customer', accessor: (r: any) => store.customers.find(c => c.id === r.customerId)?.name || 'Guest Walk-in' },
    { header: 'Outlet', accessor: (r: any) => store.outlets.find(o => o.id === r.outletId)?.name },
    { header: 'Amount', accessor: (r: any) => `₹${r.totalAmount.toFixed(2)}` },
    { header: 'Status', accessor: (r: any) => (
      <span className="vy-pill" style={{ ['--pill' as any]: statusColors[r.status] || 'var(--color-muted-text)' }}>
        {r.status}
      </span>
    )}
  ];

  return (
    <div className="vy-page">
      <div className="vy-page-header">
        <h1 className="vy-page-title">Orders</h1>
        <Button onClick={() => setIsCreateOpen(true)} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
          <Plus size={16} style={{ marginRight: 8 }} /> Create Order
        </Button>
      </div>

      <div className="vy-toolbar">
        <div className="vy-search">
          <Input aria-label="Search orders" placeholder="Search Order ID or Customer..." value={search} onChange={(e: any) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
          <Search size={16} />
        </div>
        <Select aria-label="Filter by status" value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} style={{ width: 170 }}>
          <option value="">All Statuses</option>
          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>
        <Select aria-label="Filter by outlet" value={outletFilter} onChange={(e: any) => setOutletFilter(e.target.value)} style={{ width: 170 }}>
          <option value="">All Outlets</option>
          {store.outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="desktop-table-only table-responsive-sticky card-base" style={{ padding: 0, overflow: 'hidden' }}>
        <Table columns={columns} data={filteredOrders} emptyMessage="No orders match your filters." />
      </div>

      {/* Mobile Card List */}
      <div className="mobile-cards-only">
        {filteredOrders.map(o => {
          const customerName = store.customers.find(c => c.id === o.customerId)?.name || 'Guest Walk-in';
          return (
            <div
              key={o.id}
              onClick={() => navigate(`/orders/${o.id}`)}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: 14 }}>
                  #{o.id.toUpperCase()}
                </span>
                <span className="vy-pill" style={{ ['--pill' as any]: statusColors[o.status] || 'var(--color-muted-text)' }}>
                  {o.status}
                </span>
              </div>
              <div className="truncate-ellipsis" title={customerName} style={{ fontWeight: 600, fontSize: 15 }}>
                {customerName}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-muted-text)' }}>
                <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                <strong style={{ color: 'var(--color-text)' }}>₹{o.totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {isCreateOpen && <CreateOrderModal isOpen={true} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
};
