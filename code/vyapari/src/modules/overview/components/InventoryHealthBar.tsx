import { useStore } from '../../../services/store';
import { Card } from '../../../components/ui/Card';
import { useNavigate } from 'react-router-dom';

export const InventoryHealthBar = () => {
  const store = useStore();
  const navigate = useNavigate();

  const total = store.inventoryRecords.length;
  const outOfStock = store.inventoryRecords.filter(i => i.quantity === 0).length;
  const critical = store.inventoryRecords.filter(i => i.quantity > 0 && i.quantity <= i.reorderLevel / 2).length;
  const low = store.inventoryRecords.filter(i => i.quantity > i.reorderLevel / 2 && i.quantity <= i.reorderLevel).length;
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
      <h3 style={{ margin: '0 0 16px 0' }}>Inventory Health</h3>
      
      <div style={{ display: 'flex', height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {segments.map(seg => seg.count > 0 && (
          <div 
            key={seg.label}
            onClick={() => navigate(`/inventory?filter=${seg.filter}`)}
            style={{ 
              width: `${(seg.count / total) * 100}%`, 
              backgroundColor: seg.color,
              cursor: 'pointer',
              transition: 'opacity 0.2s'
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
