import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../../services/store';
import { Search, Package, Users, FileText, Briefcase, ShoppingCart } from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        isOpen ? onClose() : document.dispatchEvent(new CustomEvent('open-command-palette'));
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const state = store.getState();
  const q = query.toLowerCase();

  const results = [];
  
  if (q) {
    const pMatches = state.products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 3);
    if (pMatches.length) results.push({ group: 'Products', items: pMatches.map(p => ({ icon: Package, label: p.name, sub: p.sku, path: '/inventory' }))});

    const cMatches = state.customers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 3);
    if (cMatches.length) results.push({ group: 'Customers', items: cMatches.map(c => ({ icon: Users, label: c.name, sub: 'Customer', path: '/customers' }))});

    const oMatches = state.orders.filter(o => o.id.toLowerCase().includes(q)).slice(0, 3);
    if (oMatches.length) results.push({ group: 'Orders', items: oMatches.map(o => ({ icon: ShoppingCart, label: `Order ${o.id}`, sub: `$${o.totalAmount}`, path: '/orders' }))});

    const iMatches = state.invoices.filter(i => i.invoiceNumber.toLowerCase().includes(q)).slice(0, 3);
    if (iMatches.length) results.push({ group: 'Invoices', items: iMatches.map(i => ({ icon: FileText, label: i.invoiceNumber, sub: `$${i.amount}`, path: '/invoices' }))});

    const eMatches = state.employees.filter(e => e.name.toLowerCase().includes(q)).slice(0, 3);
    if (eMatches.length) results.push({ group: 'Employees', items: eMatches.map(e => ({ icon: Briefcase, label: e.name, sub: 'Employee', path: '/employees' }))});
  }

  const flatResults = results.flatMap(g => g.items);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (flatResults.length || 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatResults.length) % (flatResults.length || 1));
    }
    if (e.key === 'Enter' && flatResults[selectedIndex]) {
      navigate(flatResults[selectedIndex].path);
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '10vh' }} onClick={onClose}>
      <div style={{ width: 600, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={20} color="var(--color-muted-text)" />
          <input
            ref={inputRef}
            placeholder="Search products, customers, orders..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 16, backgroundColor: 'transparent', color: 'var(--color-text)' }}
          />
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {q && flatResults.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-text)' }}>No results found for "{query}"</div>
          ) : (
            results.map(group => (
              <div key={group.group}>
                <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)', backgroundColor: 'var(--color-background)' }}>{group.group}</div>
                {group.items.map(item => {
                  const idx = flatResults.indexOf(item);
                  const selected = idx === selectedIndex;
                  return (
                    <div 
                      key={item.label + item.sub}
                      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', backgroundColor: selected ? 'var(--color-background)' : 'transparent', borderLeft: selected ? '3px solid var(--color-primary)' : '3px solid transparent' }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => { navigate(item.path); onClose(); }}
                    >
                      <item.icon size={18} color="var(--color-muted-text)" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>{item.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
