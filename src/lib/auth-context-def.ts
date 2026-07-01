import { createContext } from 'react';
import type { User } from '../types';
import type { LoginPayload } from './services/auth';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User>;
  setUser: (u: User) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ user: null as unknown as User }),
  logout: async () => {},
  refreshUser: async () => null as unknown as User,
  setUser: () => {},
});
