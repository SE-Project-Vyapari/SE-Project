import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../services/store';
import { mockApi } from '../../services/mockApi';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { ProductGrid } from './components/ProductGrid';
import { CartPanel } from './components/CartPanel';
import { ScannerModal } from './components/ScannerModal';
import { SuccessScreen } from './components/SuccessScreen';

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  note: string;
}

export const PosPage = () => {
  const { currentUser } = useAuth();
  const businessId = currentUser?.businessId || '';
  const storeOutlets = useStore(state => state.outlets);
  const outletId = currentUser?.outletId || storeOutlets[0]?.id; // Fallback to first if all
  const cashierId = currentUser?.id || '';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit'>('cash');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' to focus search
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl+Enter to checkout
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customerId, paymentMethod]); // Rebind to get latest state in handler

  const handleAddToCart = (productId: string, price: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1, unitPrice: price, discount: 0, discountType: 'amount', note: '' }];
    });
  };

  const handleUpdateCart = (productId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, ...updates } : item));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    if (paymentMethod === 'credit' && !customerId) {
      alert('Credit sales require a selected customer.');
      return;
    }

    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      await mockApi.recordSale({
        businessId,
        outletId,
        cashierId,
        customerId,
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          unitPrice: c.unitPrice - (c.discountType === 'amount' ? c.discount : (c.unitPrice * (c.discount / 100)))
        }))
      });
      
      const elapsedMs = performance.now() - startTime;
      const totalAmount = cart.reduce((sum, item) => {
        const p = item.unitPrice - (item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100)));
        return sum + (p * item.quantity);
      }, 0);

      setSuccessData({ elapsedMs, total: totalAmount, customerId, paymentMethod });
    } catch (err: any) {
      alert(err.message || 'Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPos = () => {
    setCart([]);
    setCustomerId(undefined);
    setPaymentMethod('cash');
    setSuccessData(null);
    setSearchQuery('');
    setCategoryFilter('');
  };

  if (successData) {
    return <SuccessScreen data={successData} onReset={resetPos} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-background)' }}>
      {/* Main Product Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--spacing-24)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Point of Sale</h1>
        </div>
        
        <ProductGrid 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onAdd={handleAddToCart}
          onOpenScanner={() => setIsScannerOpen(true)}
          searchInputRef={searchInputRef}
          outletId={outletId}
        />
      </div>

      {/* Cart Panel Sidebar */}
      <div style={{ width: 400, backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <CartPanel 
          cart={cart}
          onUpdateCart={handleUpdateCart}
          onRemoveFromCart={handleRemoveFromCart}
          customerId={customerId}
          setCustomerId={setCustomerId}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onCheckout={handleCheckout}
          isProcessing={isProcessing}
          onClear={() => {
            if(window.confirm('Clear cart?')) setCart([]);
          }}
        />
      </div>

      {isScannerOpen && (
        <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={(barcode) => {
          setSearchQuery(barcode);
          setIsScannerOpen(false);
        }} />
      )}
    </div>
  );
};
