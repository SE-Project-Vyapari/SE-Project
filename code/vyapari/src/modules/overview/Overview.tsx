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
    <div className="vy-page">
      
      {/* Contextual Header */}
      <div className="vy-page-header" style={{ alignItems: 'flex-end' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="vy-page-title">
            {greeting}, {currentUser?.name ? currentUser.name.replace(/\s*\(Owner\)/i, '').trim() : 'Admin'}
          </h1>
          <p className="vy-page-subtitle">
            Here's how your business is doing today. <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{currentOutlet}</span> • {today}
          </p>
        </div>
        
        <div className="vy-actions">
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
      <div className="vy-dash-grid">
        {/* Left Column (Spans 2) */}
        <div className="vy-dash-main">
          <SalesChart />
          <div className="vy-dash-pair">
            <InventoryHealthBar />
            <ActionCenter />
          </div>
        </div>

        {/* Right Column (Spans 1) */}
        <div style={{ minWidth: 0 }}>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};
