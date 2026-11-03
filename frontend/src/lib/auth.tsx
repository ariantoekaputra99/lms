import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../services/api';
import type { AuthResponse, User } from '../types/api';

type AuthState = {
  user: User | null;
  /** true until the stored token has been checked against /auth/me */
  loading: boolean;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState>({
  user: null, loading: true, signIn: () => {}, signOut: () => {}, setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (!tokenStore.get()) return;
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const signIn = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut, setUser }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const isInstructor = (u?: User | null) => u?.role === 'INSTRUCTOR' || u?.role === 'ADMIN';
