import api from '../api';
import { tokens } from '../api';
import type { User, AuthTokens } from '../../types';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload {
  email: string; first_name: string; last_name: string;
  phone: string; role: string; password: string; password2: string; language?: string;
}

export interface RegisterResult {
  requires_verification: boolean;
  detail: string;
  user?: User;
  access?: string;
  refresh?: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<{ user: User; tokens: AuthTokens }> {
    const { data: tkn } = await api.post<AuthTokens>('/auth/login/', payload);
    tokens.setTokens(tkn.access, tkn.refresh);
    const { data: user } = await api.get<User>('/auth/me/');
    return { user, tokens: tkn };
  },

  /**
   * Register a new user.
   *
   * - Farmer / Investor / Consumer  → backend returns tokens immediately,
   *   we store them and return requires_verification: false + the user object.
   * - Monitoring Officer / Vet / Input Dealer → backend returns a pending
   *   message only (no tokens), requires_verification: true.
   */
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const { data } = await api.post<RegisterResult>('/auth/register/', payload);

    if (!data.requires_verification && data.access && data.refresh) {
      tokens.setTokens(data.access, data.refresh);
    }

    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me/');
    return data;
  },

  async logout(): Promise<void> {
    const refresh = tokens.getRefresh();
    if (refresh) {
      try { await api.post('/auth/logout/', { refresh }); } catch { /* ignore */ }
    }
    tokens.clearTokens();
  },

  async changePassword(old_password: string, new_password: string): Promise<void> {
    await api.put('/auth/change-password/', { old_password, new_password });
  },

  async updateMe(data: FormData | Record<string, unknown>): Promise<User> {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const { data: user } = await api.patch<User>('/auth/me/', data, { headers });
    return user;
  },

  async getFarmerProfile(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/profiles/farmer/');
    return data;
  },
  async updateFarmerProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data: profile } = await api.patch('/profiles/farmer/', data);
    return profile;
  },

  async getInvestorProfile(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/profiles/investor/');
    return data;
  },
  async updateInvestorProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data: profile } = await api.patch('/profiles/investor/', data);
    return profile;
  },
};
