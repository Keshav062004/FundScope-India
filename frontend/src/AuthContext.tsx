import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from './api';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const { user } = await api.session();
      setUser(user);
    } catch (cause) {
      setUser(null);
      setError(cause instanceof Error ? cause.message : 'Authentication service is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.session().then(({ user }) => {
      if (active) setUser(user);
    }).catch((cause: unknown) => {
      if (active) {
        setUser(null);
        setError(cause instanceof Error ? cause.message : 'Authentication service is unavailable.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    await api.logout();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
