import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CommandPalette } from './components/CommandPalette';
import { RoleGuard } from './components/RoleGuard';
import { eventBus, Events } from '../services/eventBus';

export const AppShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024 && window.innerWidth > 768) {
        setSidebarCollapsed(true);
      }
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOpenCmd = () => setCmdOpen(true);
    document.addEventListener('open-command-palette', handleOpenCmd);
    
    const unsubOrder = eventBus.subscribe(Events.ORDER_STATUS_CHANGED, (payload) => {
      if (payload?.status === 'ready') {
        setToastMessage(`Order ${payload.orderId} is now Ready!`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    });

    return () => {
      document.removeEventListener('open-command-palette', handleOpenCmd);
      unsubOrder();
    };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div
        className={`app-sidebar-backdrop ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          onSearchOpen={() => setCmdOpen(true)}
          onMobileMenuOpen={() => setMobileMenuOpen(prev => !prev)}
        />
        
        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', backgroundColor: 'var(--color-background)' }}>
          <RoleGuard>
            <Outlet />
          </RoleGuard>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="vy-toast"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
