import { NavLink } from 'react-router-dom';
import { NAVIGATION_CONFIG, hasPermission } from '../permissions';
import { useAuth } from '../auth/AuthContext';
import * as Icons from 'lucide-react';
import logoMonogram from '../../assets/logo-monogram.svg';

export const Sidebar = ({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (v: boolean) => void }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'cashier';

  return (
    <aside style={{
      width: collapsed ? 80 : 260,
      backgroundColor: 'var(--color-dark)',
      color: 'var(--color-surface)',
      transition: 'width 0.2s',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      borderRight: '1px solid var(--color-border)',
      overflowY: 'auto'
    }}>
      <div style={{ padding: 'var(--spacing-16)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoMonogram} alt="Logo" width={32} />
          {!collapsed && <span style={{ fontWeight: 'bold', fontSize: 20 }}>Vyapari</span>}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: 'var(--color-surface)', cursor: 'pointer' }}>
            <Icons.ChevronLeft size={20} />
          </button>
        )}
      </div>
      
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => setCollapsed(false)} style={{ background: 'none', border: 'none', color: 'var(--color-surface)', cursor: 'pointer' }}>
            <Icons.ChevronRight size={20} />
          </button>
        </div>
      )}

      <nav style={{ flex: 1, padding: 'var(--spacing-12)' }}>
        {NAVIGATION_CONFIG.map(group => {
          const visibleItems = group.items.filter(item => hasPermission(role, item.path));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.name} style={{ marginBottom: 'var(--spacing-24)' }}>
              {!collapsed && (
                <div style={{ fontSize: 11, color: 'var(--color-muted-text)', fontWeight: 600, letterSpacing: 1, marginBottom: 8, paddingLeft: 12 }}>
                  {group.name}
                </div>
              )}
              {visibleItems.map(item => {
                const Icon = (Icons as any)[item.icon];
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      color: isActive ? 'white' : 'var(--color-muted-text)',
                      backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                      marginBottom: 4,
                      justifyContent: collapsed ? 'center' : 'flex-start'
                    })}
                    title={collapsed ? item.label : undefined}
                  >
                    {Icon && <Icon size={20} />}
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
