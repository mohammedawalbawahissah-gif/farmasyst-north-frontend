import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authService, type LoginPayload } from './services/auth';
import { tokens } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ user: null as unknown as User }),
  logout: async () => {},
  refreshUser: async () => null as unknown as User,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      if (!tokens.getAccess()) { setLoading(false); return; }
      try {
        const me = await authService.me();
        setUser(me);
      } catch {
        tokens.clearTokens();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (payload: LoginPayload) => {
    const { user: me } = await authService.login(payload);
    setUser(me);
    return { user: me };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await authService.me();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
