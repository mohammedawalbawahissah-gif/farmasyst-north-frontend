import { useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authService, type LoginPayload } from './services/auth';
import { tokens } from './api';
import { AuthContext } from './auth-context-def';

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
