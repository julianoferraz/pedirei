import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Building, DollarSign, Users, Cpu } from 'lucide-react';

interface Stats {
  totalTenants: number;
  activeTenants: number;
  totalOrders: number;
  totalRevenue: number;
  totalAiTokens: number;
  tenantsByPlan: Array<{ plan: string; count: number }>;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: Stats }>('/api/master/stats', { token })
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center text-gray-500 py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Master</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building className="text-blue-500" />} label="Total Restaurantes" value={stats?.totalTenants?.toString() || '0'} bg="bg-blue-50" />
        <StatCard icon={<Users className="text-green-500" />} label="Ativos" value={stats?.activeTenants?.toString() || '0'} bg="bg-green-50" />
        <StatCard icon={<DollarSign className="text-orange-500" />} label="Receita Total" value={formatCurrency(stats?.totalRevenue || 0)} bg="bg-orange-50" />
        <StatCard icon={<Cpu className="text-purple-500" />} label="Tokens AI" value={(stats?.totalAiTokens || 0).toLocaleString()} bg="bg-purple-50" />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4">Restaurantes por Plano</h2>
        {stats?.tenantsByPlan?.length ? (
          <div className="space-y-2">
            {stats.tenantsByPlan.map((p) => (
              <div key={p.plan} className="flex items-center justify-between text-sm">
                <span>{p.plan}</span>
                <span className="font-bold">{p.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum dado ainda.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bg}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
