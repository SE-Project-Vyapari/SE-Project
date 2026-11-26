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
import { Clock, Keyboard, ShoppingBag, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
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
      // '?' to open keyboard shortcuts modal
      if (
        e.key === '?' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
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
        paymentMethod,
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

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => {
    const p = item.unitPrice - (item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100)));
    return sum + (p * item.quantity);
  }, 0);

  return (
    <div className="pos-layout">
      {/* Main Product Area */}
      <div className="pos-grid-pane">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h1 className="vy-page-title" style={{ fontSize: 24 }}>Point of Sale</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              className="ui-hover-outline"
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
              <Keyboard size={14} /> Shortcuts (?)
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/evaluation')}
              className="ui-hover-outline"
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

      {/* Cart Panel Sidebar (Desktop) / Bottom Sheet (Mobile) */}
      <div className={`pos-cart-pane ${mobileCartOpen ? 'open' : ''}`}>
        <div
          className="pos-mobile-cart-close"
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <strong>Current Cart ({totalCartItems})</strong>
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setMobileCartOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>
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

      {/* Mobile Floating Cart Bar */}
      <div className="pos-mobile-cart-bar">
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} in cart
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            ₹{totalCartAmount.toLocaleString('en-IN')}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ShoppingBag size={16} /> View Cart
        </button>
      </div>

      {isShortcutsOpen && (
        <Modal isOpen={true} onClose={() => setIsShortcutsOpen(false)} title="POS Keyboard Shortcuts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            {[
              ['/', 'Focus product search bar'],
              ['Enter (in search)', 'Quick-add top matching in-stock product'],
              ['Ctrl + Enter', 'Complete Sale / Checkout'],
              ['?', 'Toggle this shortcuts dialog'],
              ['Ctrl + K', 'Open global Command Palette'],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-muted-text)' }}>{desc}</span>
                <kbd style={{ padding: '3px 8px', borderRadius: 6, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', fontWeight: 600, fontSize: 12 }}>
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </Modal>
      )}

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
