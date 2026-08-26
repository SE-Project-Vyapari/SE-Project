import { useStore } from '../../services/store';
import { mockApi } from '../../services/mockApi';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';

export const TransferList = () => {
  const store = useStore();
  const transfers = store.stockTransfers;

  const handleReceive = async (id: string) => {
    try {
      await mockApi.receiveTransfer(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns = [
    { header: 'Date', accessor: (r: any) => new Date(r.createdAt).toLocaleDateString() },
    { header: 'Product', accessor: (r: any) => store.products.find(p => p.id === r.productId)?.name || r.productId },
    { header: 'From', accessor: (r: any) => store.outlets.find(o => o.id === r.fromOutletId)?.name },
    { header: 'To', accessor: (r: any) => store.outlets.find(o => o.id === r.toOutletId)?.name },
    { header: 'Qty', accessor: (r: any) => r.quantity },
    { header: 'Status', accessor: (r: any) => (
      <span style={{ 
        padding: '4px 8px', borderRadius: 12, fontSize: 12, 
        backgroundColor: r.status === 'completed' ? 'var(--color-success)' : r.status === 'pending' ? 'var(--color-warning)' : 'var(--color-danger)' 
      }}>
        {r.status}
      </span>
    ) },
    { header: 'Actions', accessor: (r: any) => (
      r.status === 'pending' ? (
        <Button onClick={() => handleReceive(r.id)} style={{ padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--color-primary)', color: 'white' }}>
          Mark Received
        </Button>
      ) : r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '-'
    ) }
  ];

  return (
    <div style={{ padding: 'var(--spacing-24)' }}>
      <h1 style={{ marginBottom: 24 }}>Stock Transfers</h1>
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table columns={columns} data={transfers} />
      </div>
    </div>
  );
};
