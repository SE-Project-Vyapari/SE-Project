import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../../types';
import { store, useStore } from '../../services/store';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string) => void;
  loginAsDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const users = useStore(state => state.users);

  // Always resolve against live store.users so role updates propagate immediately
  const currentUser = sessionUserId ? users.find(u => u.id === sessionUserId) || null : null;

  const login = (email: string) => {
    const user = store.getState().users.find(u => u.email === email);
    if (user) {
      setSessionUserId(user.id);
    } else {
      alert('User not found in mock store');
    }
  };

  const loginAsDemo = () => {
    const demoUser = store.getState().users.find(u => u.id === 'u-1');
    if (demoUser) setSessionUserId(demoUser.id);
  };

  const logout = () => {
    setSessionUserId(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
