import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthState {
  token: string | null;
  driverName: string | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('driver_token'),
    driverName: localStorage.getItem('driver_name'),
  });

  const login = (token: string, name: string) => {
    localStorage.setItem('driver_token', token);
    localStorage.setItem('driver_name', name);
    setState({ token, driverName: name });
  };

  const logout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_name');
    setState({ token: null, driverName: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
