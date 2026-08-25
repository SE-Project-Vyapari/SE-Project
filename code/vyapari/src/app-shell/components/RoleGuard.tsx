import type { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../permissions';
import { Card } from '../../components/ui/Card';

export const RoleGuard = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/login" replace />;

  const allowed = hasPermission(currentUser.role, location.pathname);

  if (!allowed && location.pathname !== '/') {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Card style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Not Authorized</h2>
          <p style={{ color: 'var(--color-muted-text)' }}>Your role ({currentUser.role}) does not have permission to access <strong>{location.pathname}</strong>.</p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
