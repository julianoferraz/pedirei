import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { ShoppingBag, DollarSign, Users, TrendingUp } from 'lucide-react';

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
  ordersLast7Days: Array<{ date: string; count: number; revenue: number }>;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: Stats }>('/api/tenant/stats', { token })
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ShoppingBag className="text-blue-500" />}
          label="Pedidos Hoje"
          value={stats?.todayOrders?.toString() || '0'}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<DollarSign className="text-green-500" />}
          label="Faturamento Hoje"
          value={formatCurrency(stats?.todayRevenue || 0)}
          bg="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="text-orange-500" />}
          label="Pedidos Pendentes"
          value={stats?.pendingOrders?.toString() || '0'}
          bg="bg-orange-50"
        />
        <StatCard
          icon={<Users className="text-purple-500" />}
          label="Total Clientes"
          value={stats?.totalCustomers?.toString() || '0'}
          bg="bg-purple-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Últimos 7 dias</h2>
        {stats?.ordersLast7Days && stats.ordersLast7Days.length > 0 ? (
          <div className="space-y-2">
            {stats.ordersLast7Days.map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{day.date}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{day.count} pedidos</span>
                  <span className="font-medium">{formatCurrency(day.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum dado disponível ainda.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
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
