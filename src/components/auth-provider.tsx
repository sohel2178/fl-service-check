'use client';
import * as React from 'react';
import { api, ApiError, tokenStore } from '@/lib/api';
import type { User } from '@/lib/types';
import { unsubscribePush } from './pwa';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Token exists but the server couldn't be reached to check it. */
  unreachable: boolean;
  retry: () => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [unreachable, setUnreachable] = React.useState(false);

  const restore = React.useCallback(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setUnreachable(false);
    api<{ user: User }>('/auth/me')
      .then((d) => setUser(d.user))
      .catch((e) => {
        // Only a rejected token signs you out; a dropped connection keeps the session.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) tokenStore.clear();
        else setUnreachable(true);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(restore, [restore]);

  const login = React.useCallback(async (email: string, password: string) => {
    const d = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = React.useCallback(async () => {
    // Needs the token, so before clearing it; never blocks sign-out.
    await unsubscribePush().catch(() => {});
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return <AuthContext.Provider value={{ user, loading, unreachable, retry: restore, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
