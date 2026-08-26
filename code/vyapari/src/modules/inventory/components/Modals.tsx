import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useStore } from '../../../services/store';
import { mockApi } from '../../../services/mockApi';

export const AddProductModal = ({ isOpen, onClose, businessId, outletId }: { isOpen: boolean; onClose: () => void; businessId: string; outletId: string }) => {
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', category: '', price: 0, cost: 0, initialStock: 0, reorderLevel: 5
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mockApi.addProduct({ ...formData, businessId, outletId });
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input placeholder="Product Name" required value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Input placeholder="SKU" required value={formData.sku} onChange={(e: any) => setFormData({...formData, sku: e.target.value})} />
          <Input placeholder="Barcode (Optional)" value={formData.barcode} onChange={(e: any) => setFormData({...formData, barcode: e.target.value})} />
        </div>
        <Input placeholder="Category" required value={formData.category} onChange={(e: any) => setFormData({...formData, category: e.target.value})} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Input type="number" placeholder="Cost Price" required value={formData.cost || ''} onChange={(e: any) => setFormData({...formData, cost: Number(e.target.value)})} />
          <Input type="number" placeholder="Selling Price" required value={formData.price || ''} onChange={(e: any) => setFormData({...formData, price: Number(e.target.value)})} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input type="number" placeholder="Initial Stock" required value={formData.initialStock || ''} onChange={(e: any) => setFormData({...formData, initialStock: Number(e.target.value)})} />
          <Input type="number" placeholder="Reorder Level" required value={formData.reorderLevel || ''} onChange={(e: any) => setFormData({...formData, reorderLevel: Number(e.target.value)})} />
        </div>
        <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Save Product</Button>
      </form>
    </Modal>
  );
};

export const AdjustStockModal = ({ isOpen, onClose, productId, outletId }: { isOpen: boolean; onClose: () => void; productId: string; outletId: string }) => {
  const [change, setChange] = useState(0);
  const [reason, setReason] = useState<'in' | 'out' | 'adjustment'>('adjustment');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (change === 0) return;
    try {
      await mockApi.adjustStock({ productId, outletId, change, reason });
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Stock">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Select value={reason} onChange={(e: any) => setReason(e.target.value as any)}>
          <option value="adjustment">Correction (Misc)</option>
          <option value="in">Purchase / Received</option>
          <option value="out">Damage / Loss / Return</option>
        </Select>
        <Input type="number" placeholder="Quantity Change (e.g. -5 or 10)" required value={change || ''} onChange={(e: any) => setChange(Number(e.target.value))} />
        <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Confirm Adjustment</Button>
      </form>
    </Modal>
  );
};

export const TransferStockModal = ({ isOpen, onClose, productId, fromOutletId }: { isOpen: boolean; onClose: () => void; productId: string; fromOutletId: string }) => {
  const store = useStore();
  const outlets = store.outlets.filter(o => o.id !== fromOutletId);
  const [toOutletId, setToOutletId] = useState(outlets[0]?.id || '');
  const [quantity, setQuantity] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return alert('Quantity must be > 0');
    try {
      await mockApi.initiateTransfer({ productId, fromOutletId, toOutletId, quantity });
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stock">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Select value={toOutletId} onChange={(e: any) => setToOutletId(e.target.value)}>
          {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
        <Input type="number" placeholder="Transfer Quantity" required value={quantity || ''} onChange={(e: any) => setQuantity(Number(e.target.value))} />
        <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Initiate Transfer</Button>
      </form>
    </Modal>
  );
};
