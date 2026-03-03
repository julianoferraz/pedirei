import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch, getToken, setToken, clearToken } from '../lib/api';

interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiFetch<{ data: { tenant: any } }>('/api/tenant/profile', { token })
        .then((res) => {
          const t = res.data.tenant;
          setUser({
            id: t.id,
            tenantId: t.id,
            name: t.name,
            email: t.email,
            role: 'ADMIN',
          });
        })
        .catch(() => {
          clearToken();
          setTokenState('');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ data: { accessToken: string; user: any } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    setToken(res.data.accessToken);
    setTokenState(res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = () => {
    clearToken();
    setTokenState('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
