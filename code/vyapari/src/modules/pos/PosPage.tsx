import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { mockApi } from '../../services/mockApi';
import { scanMetrics } from '../../services/scanMetrics';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { ProductGrid } from './components/ProductGrid';
import { CartPanel } from './components/CartPanel';
import { ScannerModal } from './components/ScannerModal';
import { SuccessScreen } from './components/SuccessScreen';
import type { ScanFeedback } from '../scanner';
import { Clock } from 'lucide-react';

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  note: string;
}

export const PosPage = () => {
  const navigate = useNavigate();
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
  const cartStartAtRef = useRef<number | null>(null);
  const scanCountRef = useRef<number>(0);
  const manualCountRef = useRef<number>(0);

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

  const handleAddToCart = (
    productId: string,
    price: number,
    source: 'scan' | 'manual' = 'manual'
  ) => {
    if (cartStartAtRef.current === null) {
      cartStartAtRef.current = Date.now();
    }
    if (source === 'scan') {
      scanCountRef.current += 1;
    } else {
      manualCountRef.current += 1;
    }
    scanMetrics.recordCartAddition(source, productId);

    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1, unitPrice: price, discount: 0, discountType: 'amount', note: '' }];
    });
  };

  const handleBarcodeScan = (barcode: string): ScanFeedback => {
    const product = mockApi.findProductByBarcode(barcode);
    if (!product) {
      return {
        ok: false,
        message: `Barcode "${barcode}" not recognized. Try manual search.`,
        allowManualFallback: true,
      };
    }

    const inv = store
      .getState()
      .inventoryRecords.find(r => r.productId === product.id && r.outletId === outletId);
    const available = inv?.quantity ?? 0;
    const inCart = cart.find(c => c.productId === product.id)?.quantity ?? 0;

    if (available <= 0 || inCart >= available) {
      return {
        ok: false,
        message: `${product.name} has insufficient stock (${available} available).`,
        allowManualFallback: false,
      };
    }

    handleAddToCart(product.id, product.price, 'scan');
    return {
      ok: true,
      message: `Added ${product.name} (₹${product.price}) to cart.`,
    };
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
      const timeToBillMs = cartStartAtRef.current ? Date.now() - cartStartAtRef.current : elapsedMs;
      scanMetrics.recordBillCompleted({
        itemCount: cart.reduce((sum, i) => sum + i.quantity, 0),
        scanCount: scanCountRef.current,
        manualCount: manualCountRef.current,
        timeToBillMs,
      });

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
    cartStartAtRef.current = null;
    scanCountRef.current = 0;
    manualCountRef.current = 0;
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
          <button
            type="button"
            onClick={() => navigate('/settings/evaluation')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-muted-text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Clock size={14} /> Scan-to-Bill Metrics
          </button>
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
        <ScannerModal
          title="Scan Product Barcode"
          onClose={() => setIsScannerOpen(false)}
          onScan={handleBarcodeScan}
          keepOpenOnSuccess={true}
          onManualFallback={(code) => {
            setSearchQuery(code);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
        />
      )}
    </div>
  );
};
