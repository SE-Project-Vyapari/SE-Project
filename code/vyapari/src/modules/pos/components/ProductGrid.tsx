import React, { useMemo } from 'react';
import { useStore } from '../../../services/store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Search, Camera } from 'lucide-react';

interface ProductGridProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  onAdd: (productId: string, price: number) => void;
  onOpenScanner: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  outletId: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, onAdd, onOpenScanner, searchInputRef, outletId
}) => {
  const store = useStore();

  const categories = useMemo(() => {
    return Array.from(new Set(store.products.map(p => p.category)));
  }, [store.products]);

  const filteredProducts = useMemo(() => {
    let prods = store.products;
    if (categoryFilter) {
      prods = prods.filter(p => p.category === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      prods = prods.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return prods;
  }, [store.products, searchQuery, categoryFilter]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      const p = filteredProducts[0];
      const inv = store.inventoryRecords.find(r => r.productId === p.id && r.outletId === outletId);
      if (inv && inv.quantity > 0) {
        onAdd(p.id, p.price);
        setSearchQuery(''); // clear after quick add
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Input 
            ref={searchInputRef}
            placeholder="Search name, SKU, or barcode (Press '/' to focus)" 
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: 40 }}
          />
          <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-muted-text)' }} />
        </div>
        <Button onClick={onOpenScanner} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <Camera size={18} style={{ marginRight: 8 }} /> Scan
        </Button>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
        <button 
          onClick={() => setCategoryFilter('')} 
          style={{ padding: '6px 16px', borderRadius: 16, border: 'none', backgroundColor: categoryFilter === '' ? 'var(--color-primary)' : 'var(--color-surface)', color: categoryFilter === '' ? '#fff' : 'var(--color-text)', cursor: 'pointer' }}
        >
          All
        </button>
        {categories.map(c => (
          <button 
            key={c}
            onClick={() => setCategoryFilter(c)} 
            style={{ padding: '6px 16px', borderRadius: 16, border: 'none', backgroundColor: categoryFilter === c ? 'var(--color-primary)' : 'var(--color-surface)', color: categoryFilter === c ? '#fff' : 'var(--color-text)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {filteredProducts.map(p => {
          const inv = store.inventoryRecords.find(r => r.productId === p.id && r.outletId === outletId);
          const qty = inv?.quantity || 0;
          const isOOS = qty === 0;

          return (
            <div 
              key={p.id}
              onClick={() => { if (!isOOS) onAdd(p.id, p.price); }}
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: 'var(--radius-md)', 
                padding: 16, 
                border: '1px solid var(--color-border)',
                cursor: isOOS ? 'not-allowed' : 'pointer',
                opacity: isOOS ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative',
                transition: 'transform 0.1s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>{p.sku}</span>
                <span style={{ 
                  fontSize: 11, 
                  padding: '2px 6px', 
                  borderRadius: 12, 
                  backgroundColor: isOOS ? 'var(--color-danger)' : qty <= (inv?.reorderLevel || 5) ? 'var(--color-warning)' : 'var(--color-success)',
                  color: isOOS ? '#fff' : '#000'
                }}>
                  {isOOS ? 'Out of stock' : `${qty} in stock`}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{p.name}</h3>
              <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>₹{p.price.toLocaleString()}</div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--color-muted-text)' }}>
            No products found.
          </div>
        )}
      </div>
    </div>
  );
};
