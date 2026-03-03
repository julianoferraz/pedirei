import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import MasterLayout from './layouts/MasterLayout';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import PlansPage from './pages/PlansPage';
import ConfigPage from './pages/ConfigPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MasterLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/tenants" element={<TenantsPage />} />
                  <Route path="/plans" element={<PlansPage />} />
                  <Route path="/config" element={<ConfigPage />} />
                </Routes>
              </MasterLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
