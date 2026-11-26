import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { mockApi } from '../../services/mockApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import type { Order } from '../../types';

const STAGES = ['pending', 'confirmed', 'processing', 'ready', 'completed'];

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  
  const order = store.orders.find(o => o.id === id);
  if (!order) return <div className="vy-page">Order not found.</div>;

  const items = store.orderItems.filter(i => i.orderId === order.id);
  const customer = store.customers.find(c => c.id === order.customerId);

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    try {
      await mockApi.updateOrderStatus(order.id, newStatus);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const currentIndex = STAGES.indexOf(order.status);
  
  return (
    <div className="vy-page">
      <div className="vy-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Button onClick={() => navigate('/orders')} style={{ background: 'none', border: 'none' }} aria-label="Go back" title="Back"><ArrowLeft size={20} /></Button>
          <h1 className="vy-page-title">Order {order.id.toUpperCase()}</h1>
        </div>
        
        {/* Actions based on current status */}
        <div className="vy-actions">
          {order.status === 'pending' && <Button onClick={() => handleStatusUpdate('confirmed')} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Confirm Order</Button>}
          {order.status === 'confirmed' && <Button onClick={() => handleStatusUpdate('processing')} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Start Processing</Button>}
          {order.status === 'processing' && <Button onClick={() => handleStatusUpdate('ready')} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Mark Ready</Button>}
          {order.status === 'ready' && <Button onClick={() => handleStatusUpdate('completed')} style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>Mark Completed</Button>}
          
          {['pending', 'confirmed', 'processing', 'ready'].includes(order.status) && (
            <Button onClick={() => handleStatusUpdate('cancelled')} style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}>Cancel Order</Button>
          )}
          
          {order.status === 'completed' && (
            <Button onClick={() => handleStatusUpdate('returned')} style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-danger)' }}>Return Order</Button>
          )}
        </div>
      </div>

      <Card style={{ padding: 24 }}>
        <h3 className="vy-section-title" style={{ marginBottom: 24 }}>Order Timeline</h3>
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', minWidth: 480 }}>
          {/* Connecting line */}
          <div style={{ position: 'absolute', top: 16, left: 24, right: 24, height: 2, backgroundColor: 'var(--color-border)', zIndex: 0 }} />
          
          {STAGES.map((stage, idx) => {
            const isCompleted = currentIndex >= idx || order.status === 'completed';
            const isCurrent = currentIndex === idx;
            const isCancelled = order.status === 'cancelled' || order.status === 'returned';
            
            let circleColor = 'var(--color-surface)';
            let iconColor = 'var(--color-muted-text)';
            
            if (isCompleted) {
              circleColor = 'var(--color-success)';
              iconColor = 'white';
            } else if (isCurrent && !isCancelled) {
              circleColor = 'var(--color-primary)';
              iconColor = 'white';
            }

            const historyEntry = order.history?.find((h: any) => h.status === stage);

            return (
              <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: 100 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: circleColor, border: `2px solid ${isCompleted || isCurrent ? circleColor : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  {isCompleted && <CheckCircle size={16} color={iconColor} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: isCurrent ? 'bold' : 'normal', textTransform: 'capitalize' }}>{stage}</div>
                {historyEntry && <div style={{ fontSize: 10, color: 'var(--color-muted-text)', marginTop: 4 }}>{new Date(historyEntry.timestamp).toLocaleTimeString()}</div>}
              </div>
            );
          })}
        </div>
        </div>
        {['cancelled', 'returned'].includes(order.status) && (
          <div style={{ marginTop: 24, padding: 12, backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 8, textAlign: 'center' }}>
            This order was {order.status} on {order.history?.[order.history.length-1]?.timestamp ? new Date(order.history[order.history.length-1].timestamp).toLocaleString() : ''}.
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Card style={{ flex: 2, padding: 24, minWidth: 'min(300px, 100%)' }}>
          <h3 className="vy-section-title">Line Items</h3>
          <Table 
            columns={[
              { header: 'Product', accessor: (r: any) => store.products.find(p => p.id === r.productId)?.name },
              { header: 'Price', accessor: (r: any) => `₹${r.unitPrice.toFixed(2)}` },
              { header: 'Qty', accessor: (r: any) => r.quantity },
              { header: 'Subtotal', accessor: (r: any) => <span style={{ fontWeight: 'bold' }}>₹{r.subtotal.toFixed(2)}</span> }
            ]}
            data={items}
          />
        </Card>

        <Card style={{ flex: 1, padding: 24, minWidth: 'min(250px, 100%)' }}>
          <h3 className="vy-section-title">Order Summary</h3>
          <p><strong>Customer:</strong> {customer?.name || 'Guest'}</p>
          <p><strong>Outlet:</strong> {store.outlets.find(o => o.id === order.outletId)?.name}</p>
          <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
          
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 'bold' }}>
              <span>Total Amount:</span>
              <span>₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
