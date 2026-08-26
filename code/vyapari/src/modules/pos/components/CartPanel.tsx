import React from 'react';
import { useStore } from '../../../services/store';
import type { CartItem } from '../PosPage';
import { Button } from '../../../components/ui/Button';
import { Trash2, UserPlus, CreditCard, Banknote, Smartphone, Minus, Plus } from 'lucide-react';
import { Select } from '../../../components/ui/Select';

interface CartPanelProps {
  cart: CartItem[];
  onUpdateCart: (id: string, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (id: string) => void;
  customerId: string | undefined;
  setCustomerId: (id: string | undefined) => void;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
  setPaymentMethod: (m: any) => void;
  onCheckout: () => void;
  isProcessing: boolean;
  onClear: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart, onUpdateCart, onRemoveFromCart, customerId, setCustomerId, paymentMethod, setPaymentMethod, onCheckout, isProcessing, onClear
}) => {
  const store = useStore();
  
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => {
    const d = item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100));
    return sum + (d * item.quantity);
  }, 0);
  
  // Simplified fixed GST 18% for demo, applied after discount
  const taxableAmount = subtotal - totalDiscount;
  const tax = taxableAmount * 0.18;
  const grandTotal = taxableAmount + tax;

  const handleQtyChange = (productId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 1) {
      onRemoveFromCart(productId);
      return;
    }
    
    // Check inventory
    const p = store.products.find(p => p.id === productId);
    const inv = store.inventoryRecords.find(r => r.productId === productId);
    if (inv && newQty > inv.quantity) {
      alert(`Only ${inv.quantity} in stock for ${p?.name}`);
      return;
    }
    
    onUpdateCart(productId, { quantity: newQty });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Customer Selector */}
      <div style={{ padding: 'var(--spacing-16)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Select value={customerId || 'walk_in'} onChange={(e: any) => setCustomerId(e.target.value === 'walk_in' ? undefined : e.target.value)}>
            <option value="walk_in">Walk-in Customer</option>
            {store.customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email})</option>
            ))}
          </Select>
        </div>
        <Button style={{ padding: '0 12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <UserPlus size={16} />
        </Button>
      </div>

      {/* Cart Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-16)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted-text)', marginTop: 40 }}>
            <ShoppingCartIcon />
            <p>Cart is empty</p>
          </div>
        ) : (
          cart.map(item => {
            const prod = store.products.find(p => p.id === item.productId);
            const lineSubtotal = (item.unitPrice - (item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100)))) * item.quantity;
            return (
              <div key={item.productId} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 500 }}>{prod?.name}</div>
                  <div style={{ fontWeight: 600 }}>₹{lineSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--color-border)', borderRadius: 4, padding: 2 }}>
                    <button onClick={() => handleQtyChange(item.productId, item.quantity, -1)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={14}/></button>
                    <span style={{ fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => handleQtyChange(item.productId, item.quantity, 1)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={14}/></button>
                  </div>
                  <button onClick={() => onRemoveFromCart(item.productId)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary & Payment */}
      <div style={{ padding: 'var(--spacing-16)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
          <span style={{ color: 'var(--color-muted-text)' }}>Subtotal</span>
          <span>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
          <span style={{ color: 'var(--color-muted-text)' }}>Discount</span>
          <span style={{ color: 'var(--color-success)' }}>-₹{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--color-muted-text)' }}>Tax (GST 18%)</span>
          <span>₹{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 20, fontWeight: 'bold' }}>
          <span>Total</span>
          <span>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Payment Methods */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, backgroundColor: 'var(--color-surface)', padding: 4, borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {[
            { id: 'cash', icon: Banknote, label: 'Cash' },
            { id: 'upi', icon: Smartphone, label: 'UPI' },
            { id: 'card', icon: CreditCard, label: 'Card' },
            { id: 'credit', icon: UserPlus, label: 'Credit' }
          ].map(method => (
            <button
              key={method.id}
              onClick={() => setPaymentMethod(method.id as any)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 0',
                border: 'none',
                borderRadius: 4,
                backgroundColor: paymentMethod === method.id ? 'var(--color-primary)' : 'transparent',
                color: paymentMethod === method.id ? '#fff' : 'var(--color-muted-text)',
                cursor: 'pointer'
              }}
            >
              <method.icon size={16} />
              <span style={{ fontSize: 11 }}>{method.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={onClear} disabled={cart.length===0} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            Clear
          </Button>
          <Button 
            onClick={onCheckout} 
            disabled={cart.length === 0 || isProcessing}
            style={{ flex: 1, backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            {isProcessing ? 'Processing...' : 'Complete Sale (Ctrl+Enter)'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ShoppingCartIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2, marginBottom: 16 }}>
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);
