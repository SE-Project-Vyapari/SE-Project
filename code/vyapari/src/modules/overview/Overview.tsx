import { useAuth } from '../../app-shell/auth/AuthContext';
import { useStore } from '../../services/store';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Plus, ShoppingCart, Users, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { BusinessHealth } from './components/BusinessHealth';
import { SalesChart } from './components/SalesChart';
import { InventoryHealthBar } from './components/InventoryHealthBar';
import { ActionCenter } from './components/ActionCenter';
import { ActivityFeed } from './components/ActivityFeed';

export const Overview = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const outlets = useStore(state => state.outlets);
  
  const currentOutlet = outlets.find(o => o.id === currentUser?.outletId)?.name || 'All Outlets';
  const today = format(new Date(), 'EEEE, MMMM do');
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding: 'var(--spacing-32)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      
      {/* Contextual Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>{greeting}, {currentUser?.name}</h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
            Here's how your business is doing today. <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{currentOutlet}</span> • {today}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => navigate('/pos')} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <ShoppingCart size={16} style={{ marginRight: 8 }} /> New Sale
          </Button>
          <Button onClick={() => navigate('/inventory?add=true')} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <Plus size={16} style={{ marginRight: 8 }} /> Add Product
          </Button>
          <Button onClick={() => navigate('/finance?add=true')} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <DollarSign size={16} style={{ marginRight: 8 }} /> Create Expense
          </Button>
          <Button onClick={() => navigate('/customers?add=true')} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <Users size={16} style={{ marginRight: 8 }} /> Add Customer
          </Button>
        </div>
      </div>

      {/* Health Metrics */}
      <BusinessHealth />

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-24)' }}>
        {/* Left Column (Spans 2) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
          <SalesChart />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-24)' }}>
            <InventoryHealthBar />
            <ActionCenter />
          </div>
        </div>

        {/* Right Column (Spans 1) */}
        <div style={{ gridColumn: 'span 1' }}>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};
