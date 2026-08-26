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
      <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate(`/orders/${r.id}`)}>
        {r.id.toUpperCase()}
      </span>
    )},
    { header: 'Date', accessor: (r: any) => new Date(r.createdAt).toLocaleString() },
    { header: 'Customer', accessor: (r: any) => store.customers.find(c => c.id === r.customerId)?.name || 'Guest Walk-in' },
    { header: 'Outlet', accessor: (r: any) => store.outlets.find(o => o.id === r.outletId)?.name },
    { header: 'Amount', accessor: (r: any) => `₹${r.totalAmount.toFixed(2)}` },
    { header: 'Status', accessor: (r: any) => (
      <span style={{ 
        padding: '4px 8px', borderRadius: 12, fontSize: 12, 
        backgroundColor: statusColors[r.status] || 'gray', color: '#fff', textTransform: 'capitalize' 
      }}>
        {r.status}
      </span>
    )}
  ];

  return (
    <div style={{ padding: 'var(--spacing-24)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <Button onClick={() => setIsCreateOpen(true)} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
          <Plus size={16} style={{ marginRight: 8 }} /> Create Order
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Input placeholder="Search Order ID or Customer..." value={search} onChange={(e: any) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-muted-text)' }} />
        </div>
        <Select value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All Statuses</option>
          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>
        <Select value={outletFilter} onChange={(e: any) => setOutletFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All Outlets</option>
          {store.outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table columns={columns} data={filteredOrders} />
      </div>

      {isCreateOpen && <CreateOrderModal isOpen={true} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
};
