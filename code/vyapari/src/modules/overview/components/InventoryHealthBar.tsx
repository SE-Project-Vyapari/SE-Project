import { useStore } from '../../../services/store';
import { Card } from '../../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { getStockStatus } from '../../../services/selectors';

export const InventoryHealthBar = () => {
  const store = useStore();
  const navigate = useNavigate();

  const total = store.inventoryRecords.length;
  const outOfStock = store.inventoryRecords.filter(i => getStockStatus(i.quantity, i.reorderLevel) === 'Out of Stock').length;
  const critical = store.inventoryRecords.filter(i => getStockStatus(i.quantity, i.reorderLevel) === 'Critical').length;
  const low = store.inventoryRecords.filter(i => getStockStatus(i.quantity, i.reorderLevel) === 'Low Stock').length;
  const healthy = total - outOfStock - critical - low;

  if (total === 0) return null;

  const segments = [
    { label: 'Out of Stock', count: outOfStock, color: 'var(--color-danger)', filter: 'out' },
    { label: 'Critical', count: critical, color: '#f59e0b', filter: 'critical' },
    { label: 'Low Stock', count: low, color: '#fbbf24', filter: 'low' },
    { label: 'Healthy', count: healthy, color: 'var(--color-success)', filter: 'healthy' }
  ];

  return (
    <Card style={{ padding: 'var(--spacing-24)' }}>
      <h3 className="vy-card-title" style={{ marginBottom: 16 }}>Inventory Health</h3>
      
      <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 999, overflow: 'hidden', marginBottom: 16, backgroundColor: 'var(--color-surface-sunken)' }}>
        {segments.map(seg => seg.count > 0 && (
          <div 
            key={seg.label}
            className="vy-health-seg"
            onClick={() => navigate(`/inventory?filter=${seg.filter}`)}
            style={{ 
              width: `${(seg.count / total) * 100}%`, 
              backgroundColor: seg.color,
              cursor: 'pointer',
                          }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-muted-text)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: seg.color }} />
            {seg.label} ({seg.count})
          </div>
        ))}
      </div>
    </Card>
  );
};
