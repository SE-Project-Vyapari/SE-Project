import React, { useState } from 'react';
import { useStore } from '../../../services/store';
import type { CartItem } from '../PosPage';
import { Button } from '../../../components/ui/Button';
import { Trash2, UserPlus, CreditCard, Banknote, Smartphone, Minus, Plus } from 'lucide-react';
import { Select } from '../../../components/ui/Select';
import { AddCustomerModal } from '../../crm';
import { formatINR } from '../../../utils/format';
import { getGstRate, gstIncludedIn } from '../../../utils/gst';

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
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => {
    const d = item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100));
    return sum + (d * item.quantity);
  }, 0);
  
  // Prices are GST-inclusive (same model as invoices): the customer pays the
  // discounted shelf price, and the GST contained in it is shown for reference.
  const grandTotal = subtotal - totalDiscount;
  const tax = cart.reduce((sum, item) => {
    const prod = store.products.find(p => p.id === item.productId);
    const unitNet = item.unitPrice - (item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100)));
    return sum + gstIncludedIn(unitNet * item.quantity, getGstRate(prod?.category));
  }, 0);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Customer Selector */}
      <div style={{ padding: 'var(--spacing-16)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Select aria-label="Customer" value={customerId || 'walk_in'} onChange={(e: any) => setCustomerId(e.target.value === 'walk_in' ? undefined : e.target.value)}>
            <option value="walk_in">Walk-in Customer</option>
            {store.customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email})</option>
            ))}
          </Select>
        </div>
        <Button
          onClick={() => setIsAddCustomerOpen(true)}
          variant="secondary"
          aria-label="Add new customer"
          title="Add new customer"
        >
          <UserPlus size={16} />
        </Button>
      </div>

      {isAddCustomerOpen && (
        <AddCustomerModal
          onClose={() => setIsAddCustomerOpen(false)}
          onCustomerCreated={newCust => setCustomerId(newCust.id)}
        />
      )}

      {/* Cart Items */}
      <div style={{ flex: 1, minHeight: 120, overflowY: 'auto', padding: 'var(--spacing-16)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted-text)', margin: 'auto 0', padding: '32px 0' }}>
            <ShoppingCartIcon />
            <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>Cart is empty</p>
            <p style={{ fontSize: 13 }}>Tap a product to add it to the sale.</p>
          </div>
        ) : (
          cart.map(item => {
            const prod = store.products.find(p => p.id === item.productId);
            const lineSubtotal = (item.unitPrice - (item.discountType === 'amount' ? item.discount : (item.unitPrice * (item.discount / 100)))) * item.quantity;
            return (
              <div key={item.productId} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-dark)', overflowWrap: 'anywhere' }}>{prod?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-text)', fontVariantNumeric: 'tabular-nums' }}>₹{item.unitPrice.toLocaleString()} each</div>
                  </div>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>₹{lineSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="vy-qty-stepper">
                    <button type="button" aria-label={`Decrease quantity of ${prod?.name}`} onClick={() => handleQtyChange(item.productId, item.quantity, -1)}><Minus size={14}/></button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button type="button" aria-label={`Increase quantity of ${prod?.name}`} onClick={() => handleQtyChange(item.productId, item.quantity, 1)}><Plus size={14}/></button>
                  </div>
                  <Button variant="danger-ghost" size="sm" onClick={() => onRemoveFromCart(item.productId)} aria-label={`Remove ${prod?.name} from cart`} title="Remove item">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary & Payment */}
      <div style={{ padding: 'var(--spacing-16)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-sunken)' }}>
        <div className="vy-summary-row">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatINR(subtotal, { showDecimals: true })}</span>
        </div>
        <div className="vy-summary-row">
          <span>Discount</span>
          <span style={{ color: 'var(--color-success)' }} className="tabular-nums">
            {formatINR(-totalDiscount, { showDecimals: true })}
          </span>
        </div>
        <div className="vy-summary-row">
          <span>GST (included)</span>
          <span className="tabular-nums">{formatINR(tax, { showDecimals: true })}</span>
        </div>
        <div className="vy-summary-total">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(grandTotal, { showDecimals: true })}</span>
        </div>

        {/* Payment Methods */}
        <div className="vy-pay-methods" role="radiogroup" aria-label="Payment method">
          {[
            { id: 'cash', icon: Banknote, label: 'Cash' },
            { id: 'upi', icon: Smartphone, label: 'UPI' },
            { id: 'card', icon: CreditCard, label: 'Card' },
            { id: 'credit', icon: UserPlus, label: 'Credit' }
          ].map(method => (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={paymentMethod === method.id}
              onClick={() => setPaymentMethod(method.id as any)}
              className={`vy-pay-method${paymentMethod === method.id ? ' vy-pay-method--active' : ''}`}
            >
              <method.icon size={18} />
              <span>{method.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={onClear} disabled={cart.length===0} variant="secondary" style={{ minHeight: 46 }}>
            Clear
          </Button>
          <Button 
            onClick={onCheckout} 
            disabled={cart.length === 0 || isProcessing}
            variant="primary"
            aria-busy={isProcessing}
            style={{ flex: 1, minHeight: 46, fontSize: 15 }}
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
