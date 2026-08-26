import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';
import { useAuth } from '../../../app-shell/auth/AuthContext';
import { Plus, Trash2 } from 'lucide-react';

export const CreateOrderModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const store = useStore();
  const { currentUser } = useAuth();
  
  const [customerId, setCustomerId] = useState('');
  const [outletId, setOutletId] = useState(currentUser?.outletId || store.outlets[0]?.id || '');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([]);
  const [notes, setNotes] = useState('');

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = store.products.find(p => p.id === value);
      newItems[index] = { 
        ...newItems[index], 
        productId: value as string, 
        unitPrice: product ? product.price : 0 
      };
    } else {
      (newItems[index] as any)[field] = value;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert('Cannot create order with zero items.');
    if (items.some(i => !i.productId || i.quantity <= 0)) return alert('All items must have a product and valid quantity.');
    
    try {
      await mockApi.createOrder({
        outletId,
        cashierId: currentUser!.id,
        customerId: customerId || undefined,
        items,
        notes
      });
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Manual Order">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Customer (Optional)</label>
            <Select value={customerId} onChange={(e: any) => setCustomerId(e.target.value)}>
              <option value="">Guest Walk-in</option>
              {store.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Outlet</label>
            <Select value={outletId} onChange={(e: any) => setOutletId(e.target.value)} required>
              {store.outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 'bold' }}>Line Items</label>
            <Button type="button" onClick={handleAddItem} style={{ padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--color-surface)' }}>
              <Plus size={14} /> Add Item
            </Button>
          </div>
          
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Select value={item.productId} onChange={(e: any) => handleItemChange(index, 'productId', e.target.value)} required style={{ flex: 2 }}>
                <option value="">Select Product...</option>
                {store.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input type="number" placeholder="Qty" value={item.quantity || ''} onChange={(e: any) => handleItemChange(index, 'quantity', Number(e.target.value))} required style={{ width: 80 }} />
              <div style={{ width: 80, fontSize: 14, textAlign: 'right' }}>₹{(item.quantity * item.unitPrice).toFixed(2)}</div>
              <Button type="button" onClick={() => handleRemoveItem(index)} style={{ padding: 4, background: 'none', border: 'none', color: 'var(--color-danger)' }}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          {items.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>No items added yet.</p>}
        </div>

        <Input placeholder="Notes (Optional)" value={notes} onChange={(e: any) => setNotes(e.target.value)} />

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
            Total: ₹{items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
          </div>
          <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Create Order</Button>
        </div>
      </form>
    </Modal>
  );
};
