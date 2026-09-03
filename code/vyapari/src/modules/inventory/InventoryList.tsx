import { useState, useMemo } from 'react';
import { useStore } from '../../services/store';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Search, Plus, ArrowRightLeft, FileDown, Upload } from 'lucide-react';
import { AddProductModal, AdjustStockModal, TransferStockModal } from './components/Modals';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../../utils/format';

export const InventoryList = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const store = useStore();
  
  const isStaff = currentUser?.role === 'cashier';
  const currentOutletId = currentUser?.outletId || store.outlets[0]?.id;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null);
  const [transferProductId, setTransferProductId] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(store.products.map(p => p.category))), [store.products]);

  const inventoryData = useMemo(() => {
    return store.products.map(p => {
      const inv = store.inventoryRecords.find(r => r.productId === p.id && r.outletId === currentOutletId);
      const qty = inv?.quantity || 0;
      const reorder = inv?.reorderLevel || 0;
      
      let status = 'Healthy';
      let statusColor = 'var(--color-success)';
      
      if (qty === 0) {
        status = 'Out of Stock';
        statusColor = 'var(--color-danger)';
      } else if (qty <= reorder * 0.25) {
        status = 'Critical';
        statusColor = 'var(--color-danger)';
      } else if (qty <= reorder) {
        status = 'Low Stock';
        statusColor = 'var(--color-warning)';
      } else if (qty >= reorder * 3 && reorder > 0) {
        status = 'Overstock';
        statusColor = 'var(--color-secondary)';
      }

      return { p, qty, reorder, status, statusColor };
    }).filter(item => {
      if (category && item.p.category !== category) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.p.name.toLowerCase().includes(q) || item.p.sku.toLowerCase().includes(q) || (item.p.barcode || '').includes(q);
      }
      return true;
    });
  }, [store.products, store.inventoryRecords, currentOutletId, search, category, statusFilter]);

  const columns = [
    { header: 'Product', accessor: (r: any) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/inventory/${r.p.id}`)}>
        <div style={{ width: 40, height: 40, backgroundColor: 'var(--color-surface)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
        <div>
          <div style={{ fontWeight: 600 }}>{r.p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>{r.p.sku} {r.p.barcode ? `• ${r.p.barcode}` : '• No barcode'}</div>
        </div>
      </div>
    ) },
    { header: 'Category', accessor: (r: any) => r.p.category },
    { header: 'Stock', accessor: (r: any) => <span style={{ fontWeight: 'bold' }}>{r.qty}</span> },
    { header: 'Status', accessor: (r: any) => (
      <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, backgroundColor: r.statusColor, color: r.status === 'Out of Stock' || r.status === 'Critical' ? '#fff' : '#000' }}>
        {r.status}
      </span>
    ) },
    !isStaff ? { header: 'Cost', accessor: (r: any) => formatINR(r.p.cost) } : null,
    { header: 'Price', accessor: (r: any) => formatINR(r.p.price) },
    !isStaff ? { header: 'Value', accessor: (r: any) => formatINR(r.qty * r.p.cost, { showDecimals: true }) } : null,
    { header: 'Actions', accessor: (r: any) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => setAdjustProductId(r.p.id)} style={{ padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--color-surface)' }}>Adjust</Button>
        <Button onClick={() => setTransferProductId(r.p.id)} style={{ padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--color-surface)' }}>Transfer</Button>
      </div>
    ) }
  ].filter(Boolean) as any;

  return (
    <div style={{ padding: 'var(--spacing-24)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Inventory</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => navigate('/inventory/transfers')} style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
            <ArrowRightLeft size={16} style={{ marginRight: 8 }} /> View Transfers
          </Button>
          <Button onClick={() => setIsAddOpen(true)} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <Plus size={16} style={{ marginRight: 8 }} /> Add Product
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Input placeholder="Search SKU or Name..." value={search} onChange={(e: any) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-muted-text)' }} />
        </div>
        <Select value={category} onChange={(e: any) => setCategory(e.target.value)} style={{ width: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All Statuses</option>
          <option value="Healthy">Healthy</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Critical">Critical</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Overstock">Overstock</option>
        </Select>
        <Button style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}><FileDown size={16} /></Button>
        <Button style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}><Upload size={16} /></Button>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table columns={columns} data={inventoryData} />
      </div>

      <AddProductModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} businessId={currentUser?.businessId!} outletId={currentOutletId!} />
      {adjustProductId && <AdjustStockModal isOpen={true} onClose={() => setAdjustProductId(null)} productId={adjustProductId} outletId={currentOutletId!} />}
      {transferProductId && <TransferStockModal isOpen={true} onClose={() => setTransferProductId(null)} productId={transferProductId} fromOutletId={currentOutletId!} />}
    </div>
  );
};
