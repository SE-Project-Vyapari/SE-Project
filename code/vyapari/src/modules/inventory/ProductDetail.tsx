import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { Table } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mockApi } from '../../services/mockApi';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  
  const product = store.products.find(p => p.id === id);
  const inventory = store.inventoryRecords.filter(r => r.productId === id);
  const movements = store.stockMovements.filter(m => m.productId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const [forecast, setForecast] = useState<any>(null);

  useEffect(() => {
    if (id) {
      mockApi.computeForecast(id).then(res => setForecast(res[0])).catch(() => {});
    }
  }, [id]);

  if (!product) return <div>Product not found</div>;

  const totalStock = inventory.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div style={{ padding: 'var(--spacing-24)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button onClick={() => navigate('/inventory')} style={{ padding: 8, background: 'none', border: 'none' }}><ArrowLeft /></Button>
        <h1 style={{ margin: 0 }}>{product.name}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <Card style={{ padding: 24 }}>
          <h3>Details</h3>
          <p><strong>SKU:</strong> {product.sku}</p>
          <p><strong>Category:</strong> {product.category}</p>
          <p><strong>Cost:</strong> ₹{product.cost}</p>
          <p><strong>Price:</strong> ₹{product.price}</p>
          <p><strong>Total Stock (All Outlets):</strong> {totalStock}</p>
        </Card>

        <Card style={{ padding: 24, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp color="var(--color-primary)" />
            <h3 style={{ margin: 0 }}>Demand Forecast</h3>
          </div>
          {forecast ? (
            <div>
              <p style={{ color: 'var(--color-muted-text)' }}>Next 30 Days moving average</p>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--color-primary)' }}>{forecast.predictedDemand} units</div>
              <p>Confidence: {(forecast.confidenceScore * 100).toFixed(0)}%</p>
              <p>Recommended reorder: {Math.max(0, forecast.predictedDemand - totalStock)} units</p>
            </div>
          ) : (
            <p>Loading forecast...</p>
          )}
        </Card>
      </div>

      <Card style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Stock by Outlet</h3>
        <Table 
          columns={[
            { header: 'Outlet', accessor: (r: any) => store.outlets.find(o => o.id === r.outletId)?.name },
            { header: 'Quantity', accessor: (r: any) => r.quantity },
            { header: 'Reorder Level', accessor: (r: any) => r.reorderLevel },
            { header: 'Last Updated', accessor: (r: any) => new Date(r.lastUpdated).toLocaleString() }
          ]}
          data={inventory}
        />
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Stock Movements History</h3>
        <Table 
          columns={[
            { header: 'Date', accessor: (r: any) => new Date(r.createdAt).toLocaleString() },
            { header: 'Type', accessor: (r: any) => r.type },
            { header: 'Change', accessor: (r: any) => (
              <span style={{ color: r.quantityChange > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                {r.quantityChange > 0 ? '+' : ''}{r.quantityChange}
              </span>
            )},
            { header: 'Outlet', accessor: (r: any) => store.outlets.find(o => o.id === r.outletId)?.name }
          ]}
          data={movements}
        />
      </Card>
    </div>
  );
};
