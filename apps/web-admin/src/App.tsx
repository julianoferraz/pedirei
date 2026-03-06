import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import MenuPage from './pages/MenuPage';
import CustomersPage from './pages/CustomersPage';
import SettingsPage from './pages/SettingsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';
import CashRegisterPage from './pages/CashRegisterPage';
import LoyaltyPage from './pages/LoyaltyPage';
import KdsPage from './pages/KdsPage';
import TableManagementPage from './pages/TableManagementPage';
import RecoveryPage from './pages/RecoveryPage';
import PixelsPage from './pages/PixelsPage';
import AiToolsPage from './pages/AiToolsPage';
import CampaignsPage from './pages/CampaignsPage';
import DeliveryPage from './pages/DeliveryPage';
import MarketplacePage from './pages/MarketplacePage';
import ConsolidatedReportsPage from './pages/ConsolidatedReportsPage';

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
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/pedidos" element={<OrdersPage />} />
                  <Route path="/cardapio" element={<MenuPage />} />
                  <Route path="/estoque" element={<InventoryPage />} />
                  <Route path="/caixa" element={<CashRegisterPage />} />
                  <Route path="/fidelidade" element={<LoyaltyPage />} />
                  <Route path="/kds" element={<KdsPage />} />
                  <Route path="/mesas" element={<TableManagementPage />} />
                  <Route path="/clientes" element={<CustomersPage />} />
                  <Route path="/whatsapp" element={<WhatsAppPage />} />
                  <Route path="/campanhas" element={<CampaignsPage />} />
                  <Route path="/recuperacao" element={<RecoveryPage />} />
                  <Route path="/pixels" element={<PixelsPage />} />
                  <Route path="/ia" element={<AiToolsPage />} />
                  <Route path="/entregas" element={<DeliveryPage />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/filiais" element={<ConsolidatedReportsPage />} />
                  <Route path="/relatorios" element={<ReportsPage />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                </Routes>
              </DashboardLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
