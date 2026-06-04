import axios, { type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers ──────────────────────────────────────────────────────────────
export const tokens = {
  getAccess:    () => localStorage.getItem('fa_access'),
  getRefresh:   () => localStorage.getItem('fa_refresh'),
  setAccess:    (t: string) => localStorage.setItem('fa_access', t),
  setRefresh:   (t: string) => localStorage.setItem('fa_refresh', t),
  setTokens:    (access: string, refresh: string) => {
    localStorage.setItem('fa_access', access);
    localStorage.setItem('fa_refresh', refresh);
  },
  clearTokens:  () => {
    localStorage.removeItem('fa_access');
    localStorage.removeItem('fa_refresh');
  },
};

// ── Request interceptor — attach Bearer token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = tokens.getAccess();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// ── Response interceptor — refresh on 401, retry, redirect on expiry ──────────
let isRefreshing = false;
type QueueEntry = { resolve: (t: string) => void; reject: (e: unknown) => void };
let queue: QueueEntry[] = [];

const flushQueue = (err: unknown, token: string | null) => {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refresh = tokens.getRefresh();
    if (!refresh) {
      tokens.clearTokens();
      window.location.replace('/login');
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh/`, { refresh });
      tokens.setAccess(data.access);
      if (data.refresh) tokens.setRefresh(data.refresh);
      flushQueue(null, data.access);
      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);
    } catch (err) {
      flushQueue(err, null);
      tokens.clearTokens();
      window.location.replace('/login');
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;

/**
 * Safely normalise any list API response regardless of shape:
 *   - Paginated<T>  → { count, results: T[] }  → returns results
 *   - T[]           → plain array               → returns as-is
 *   - T             → single object             → wraps in array
 */
export function toArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object' && 'results' in (data as object)) {
    return ((data as { results: T[] }).results) ?? [];
  }
  return [data as T];
}
