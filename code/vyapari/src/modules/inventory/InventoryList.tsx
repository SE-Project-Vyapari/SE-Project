import { useState, useMemo } from 'react';
import { useStore } from '../../services/store';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Search, Plus, ArrowRightLeft, FileDown, Upload, Camera } from 'lucide-react';
import { AddProductModal, AdjustStockModal, TransferStockModal } from './components/Modals';
import { BarcodeScannerModal } from '../scanner';
import { mockApi } from '../../services/mockApi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatINR } from '../../utils/format';
import { getStockStatus } from '../../services/selectors';

const FILTER_PARAM_MAP: Record<string, string> = {
  low: 'Low Stock',
  out: 'Out of Stock',
  critical: 'Critical',
  healthy: 'Healthy',
  overstock: 'Overstock',
};

export const InventoryList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const store = useStore();
  
  const isStaff = currentUser?.role === 'cashier';
  const currentOutletId = currentUser?.outletId || store.outlets[0]?.id;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const f = searchParams.get('filter') || '';
    return FILTER_PARAM_MAP[f] || f;
  });
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null);
  const [transferProductId, setTransferProductId] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(store.products.map(p => p.category))), [store.products]);

  const inventoryData = useMemo(() => {
    return store.products.map(p => {
      const inv = store.inventoryRecords.find(r => r.productId === p.id && r.outletId === currentOutletId);
      const qty = inv?.quantity || 0;
      const reorder = inv?.reorderLevel || 0;
      
      const status = getStockStatus(qty, reorder);
      let statusColor = 'var(--color-success)';
      if (status === 'Out of Stock' || status === 'Critical') {
        statusColor = 'var(--color-danger)';
      } else if (status === 'Low Stock') {
        statusColor = 'var(--color-warning)';
      } else if (status === 'Overstock') {
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
      <div role="link" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 180 }} onClick={() => navigate(`/inventory/${r.p.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/inventory/${r.p.id}`); }}>
        <div aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
        <div>
          <div style={{ fontWeight: 600 }}>{r.p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>{r.p.sku} {r.p.barcode ? `• ${r.p.barcode}` : '• No barcode'}</div>
        </div>
      </div>
    ) },
    { header: 'Category', accessor: (r: any) => r.p.category },
    { header: 'Stock', accessor: (r: any) => <span style={{ fontWeight: 'bold' }}>{r.qty}</span> },
    { header: 'Status', accessor: (r: any) => (
      <span className="vy-pill" style={{ ['--pill' as any]: r.statusColor }}>
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
    <div className="vy-page">
      <div className="vy-page-header">
        <h1 className="vy-page-title">Inventory</h1>
        <div className="vy-actions">
          <Button onClick={() => navigate('/inventory/transfers')} style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
            <ArrowRightLeft size={16} style={{ marginRight: 8 }} /> View Transfers
          </Button>
          <Button onClick={() => setIsAddOpen(true)} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <Plus size={16} style={{ marginRight: 8 }} /> Add Product
          </Button>
        </div>
      </div>

      <div className="vy-toolbar">
        <div className="vy-search">
          <Input aria-label="Search inventory" placeholder="Search SKU or Name..." value={search} onChange={(e: any) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
          <Search size={16} />
        </div>
        <Button
          onClick={() => setIsScannerOpen(true)}
          aria-label="Scan barcode to find product"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <Camera size={16} style={{ marginRight: 6 }} /> Scan to find
        </Button>
        <Button
          type="button"
          className="mobile-filters-toggle"
          onClick={() => setShowMoreFilters(prev => !prev)}
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          {showMoreFilters ? 'Hide Filters' : 'More Filters'}
        </Button>
        <div className={`mobile-filters-collapsible ${showMoreFilters ? '' : 'collapsed'}`} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select aria-label="Filter by category" value={category} onChange={(e: any) => setCategory(e.target.value)} style={{ width: 160 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select aria-label="Filter by stock status" value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
            <option value="">All Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Critical">Critical</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Overstock">Overstock</option>
          </Select>
        </div>
        <Button aria-label="Export inventory" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}><FileDown size={16} /></Button>
        <Button aria-label="Import inventory" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}><Upload size={16} /></Button>
      </div>

      {/* Desktop Table with Sticky Product Column */}
      <div className="desktop-table-only table-responsive-sticky card-base" style={{ padding: 0, overflow: 'hidden' }}>
        <Table columns={columns} data={inventoryData} emptyMessage="No products match your filters." />
      </div>

      {/* Mobile Card List */}
      <div className="mobile-cards-only">
        {inventoryData.map((r: any) => (
          <div
            key={r.p.id}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }} onClick={() => navigate(`/inventory/${r.p.id}`)}>
                <div className="truncate-ellipsis" title={r.p.name} style={{ fontWeight: 600, fontSize: 15 }}>
                  {r.p.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                  {r.p.sku} {r.p.barcode ? `• ${r.p.barcode}` : '• No barcode'}
                </div>
              </div>
              <span className="vy-pill" style={{ ['--pill' as any]: r.statusColor, flexShrink: 0 }}>
                {r.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span>Stock: <strong>{r.qty}</strong> • Price: <strong>{formatINR(r.p.price)}</strong></span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => setAdjustProductId(r.p.id)} style={{ padding: '4px 10px', fontSize: 12, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Adjust</Button>
                <Button onClick={() => setTransferProductId(r.p.id)} style={{ padding: '4px 10px', fontSize: 12, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Transfer</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddProductModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} businessId={currentUser?.businessId!} outletId={currentOutletId!} />
      {isScannerOpen && (
        <BarcodeScannerModal
          title="Scan to Find Product"
          onClose={() => setIsScannerOpen(false)}
          onScan={(barcode) => {
            const product = mockApi.findProductByBarcode(barcode);
            if (!product) {
              return {
                ok: false,
                message: `Barcode "${barcode}" not recognized in inventory.`,
                allowManualFallback: true,
              };
            }
            setSearch(product.sku);
            setAdjustProductId(product.id);
            return {
              ok: true,
              message: `Found ${product.name} — opening Adjust Stock.`,
            };
          }}
          onManualFallback={(code) => setSearch(code)}
        />
      )}
      {adjustProductId && <AdjustStockModal isOpen={true} onClose={() => setAdjustProductId(null)} productId={adjustProductId} outletId={currentOutletId!} />}
      {transferProductId && <TransferStockModal isOpen={true} onClose={() => setTransferProductId(null)} productId={transferProductId} fromOutletId={currentOutletId!} />}
    </div>
  );
};
