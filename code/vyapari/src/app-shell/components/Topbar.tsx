import { useAuth } from '../auth/AuthContext';
import { useStore } from '../../services/store';
import { Search, Bell, LogOut, ChevronDown } from 'lucide-react';

export const Topbar = ({ onSearchOpen }: { onSearchOpen: () => void }) => {
  const { currentUser, logout } = useAuth();
  const outlets = useStore(state => state.outlets.filter(o => o.businessId === currentUser?.businessId));
  const unreadCount = useStore(state => state.notifications.filter(n => !n.read && n.businessId === currentUser?.businessId).length);

  return (
    <header style={{ 
      height: 64, 
      backgroundColor: 'var(--color-surface)', 
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--spacing-24)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>
            {currentUser?.outletId ? outlets.find(o => o.id === currentUser.outletId)?.name : 'All Outlets'}
          </span>
          <ChevronDown size={16} color="var(--color-muted-text)" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <button 
          onClick={onSearchOpen}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '6px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-muted-text)' }}
        >
          <Search size={16} />
          <span style={{ fontSize: 14 }}>Search... (Ctrl+K)</span>
        </button>

        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={20} color="var(--color-dark)" />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'var(--color-danger)', color: 'white', fontSize: 10, padding: '2px 4px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>
              {unreadCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid var(--color-border)', paddingLeft: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUser?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted-text)', textTransform: 'capitalize' }}>{currentUser?.role}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {currentUser?.name.charAt(0)}
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-text)' }} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
