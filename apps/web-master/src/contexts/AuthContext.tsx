import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch, getToken, setToken, clearToken } from '../lib/api';

interface MasterUser {
  id: string;
  email: string;
  role: 'MASTER';
}

interface AuthContextType {
  user: MasterUser | null;
  token: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MasterUser | null>(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiFetch<{ data: any }>('/api/master/stats', { token })
        .then(() => {
          setUser({ id: 'master', email: '', role: 'MASTER' });
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
    const res = await apiFetch<{ data: { accessToken: string } }>('/api/auth/master/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.data.accessToken);
    setTokenState(res.data.accessToken);
    setUser({ id: 'master', email, role: 'MASTER' });
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
