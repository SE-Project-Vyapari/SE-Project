import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CommandPalette } from './components/CommandPalette';
import { RoleGuard } from './components/RoleGuard';

export const AppShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleOpenCmd = () => setCmdOpen(true);
    document.addEventListener('open-command-palette', handleOpenCmd);
    return () => document.removeEventListener('open-command-palette', handleOpenCmd);
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
    </div>
  );
};
