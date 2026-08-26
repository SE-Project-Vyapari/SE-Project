import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CommandPalette } from './components/CommandPalette';
import { RoleGuard } from './components/RoleGuard';
import { eventBus, Events } from '../services/eventBus';

export const AppShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onSearchOpen={() => setCmdOpen(true)} />
        
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-background)' }}>
          <RoleGuard>
            <Outlet />
          </RoleGuard>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, backgroundColor: 'var(--color-primary)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 9999 }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};
