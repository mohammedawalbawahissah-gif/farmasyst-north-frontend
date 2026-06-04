import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authService, type LoginPayload } from './services/auth';
import { tokens } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<{ user: User }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ user: null as unknown as User }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: if a valid access token exists, restore the session
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
