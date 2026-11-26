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
        <div className="vy-search">
          <Input 
            aria-label="Search products"
            ref={searchInputRef}
            placeholder="Search name, SKU, or barcode (Press '/' to focus)" 
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: 40, width: '100%' }}
          />
          <Search size={18} />
        </div>
        <Button
          onClick={onOpenScanner}
          aria-label="Scan barcode"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <Camera size={18} style={{ marginRight: 8 }} /> Scan
        </Button>
      </div>

      {/* Categories */}
      <div className="vy-chip-row" role="group" aria-label="Filter by category">
        <button 
          type="button"
          onClick={() => setCategoryFilter('')} 
          className={`vy-chip${categoryFilter === '' ? ' vy-chip--active' : ''}`}
          aria-pressed={categoryFilter === ''}
        >
          All
        </button>
        {categories.map(c => (
          <button 
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)} 
            className={`vy-chip${categoryFilter === c ? ' vy-chip--active' : ''}`}
            aria-pressed={categoryFilter === c}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="vy-product-grid">
        {filteredProducts.map(p => {
          const inv = store.inventoryRecords.find(r => r.productId === p.id && r.outletId === outletId);
          const qty = inv?.quantity || 0;
          const isOOS = qty === 0;

          return (
            <button 
              type="button"
              key={p.id}
              disabled={isOOS}
              aria-label={`Add ${p.name} to cart, ₹${p.price.toLocaleString()}${isOOS ? ', out of stock' : ''}`}
              onClick={() => { if (!isOOS) onAdd(p.id, p.price); }}
              className={`vy-product-card${isOOS ? ' vy-product-card--disabled' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
                <span style={{ fontSize: 12, color: 'var(--color-muted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sku}</span>
                <span className={`vy-stock-badge ${isOOS ? 'vy-stock-badge--out' : qty <= (inv?.reorderLevel || 5) ? 'vy-stock-badge--low' : 'vy-stock-badge--ok'}`}>
                  {isOOS ? 'Out of stock' : `${qty} in stock`}
                </span>
              </div>
              <h3 className="vy-product-card__name" title={p.name}>{p.name}</h3>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>₹{p.price.toLocaleString()}</div>
            </button>
          );
        })}
        {filteredProducts.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--color-muted-text)', border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
            No products found.
          </div>
        )}
      </div>
    </div>
  );
};
