import { NavLink } from 'react-router-dom';
import { NAVIGATION_CONFIG, hasPermission } from '../permissions';
import { useAuth } from '../auth/AuthContext';
import * as Icons from 'lucide-react';
import logoMonogram from '../../assets/logo-monogram.svg';

export const Sidebar = ({
  collapsed,
  setCollapsed,
  mobileOpen = false,
  onCloseMobile,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'cashier';

  return (
    <aside
      aria-label="Primary Navigation"
      className={`app-sidebar ${mobileOpen ? 'open' : ''}`}
      style={{
      width: collapsed ? 72 : 248,
      flexShrink: 0,
      backgroundColor: 'var(--color-dark)',
      color: 'var(--color-surface)',
      transition: 'width 0.2s',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <div style={{ minHeight: 64, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid rgba(255, 253, 248, 0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoMonogram} alt="Vyapari Logo" width={30} />
          {!collapsed && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, letterSpacing: '-0.01em' }}>Vyapari</span>}
        </div>
        {!collapsed && (
          <button className="vy-sidebar__toggle" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar">
            <Icons.ChevronLeft size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <button className="vy-sidebar__toggle" onClick={() => setCollapsed(false)} aria-label="Expand sidebar" title="Expand sidebar">
            <Icons.ChevronRight size={18} />
          </button>
        </div>
      )}

      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {NAVIGATION_CONFIG.map(group => {
          const visibleItems = group.items.filter(item => hasPermission(role, item.path));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.name} style={{ marginBottom: collapsed ? 12 : 20 }}>
              {!collapsed && (
                <div className="vy-sidebar__group-label">
                  {group.name}
                </div>
              )}
              {visibleItems.map(item => {
                const Icon = (Icons as any)[item.icon];
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => onCloseMobile?.()}
                    aria-label={item.label}
                    className="vy-nav-link"
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : undefined }}
                    title={collapsed ? item.label : undefined}
                  >
                    {Icon && <Icon size={18} />}
                    {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
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
