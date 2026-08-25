import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../../types';
import { store } from '../../services/store';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string) => void;
  loginAsDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = (email: string) => {
    // Basic mock login
    const user = store.getState().users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
    } else {
      alert('User not found in mock store');
    }
  };

  const loginAsDemo = () => {
    // Specifically log in as Owner of Aarav General Store (u-1)
    const demoUser = store.getState().users.find(u => u.id === 'u-1');
    if (demoUser) setCurrentUser(demoUser);
  };

  const logout = () => {
    setCurrentUser(null);
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
