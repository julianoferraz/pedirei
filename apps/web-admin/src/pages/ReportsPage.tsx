import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface RevenueData {
  period: string;
  revenue: number;
  orders: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: RevenueData[] }>('/api/reports/revenue?period=7d', { token }),
      apiFetch<{ data: TopItem[] }>('/api/reports/top-items?period=30d&limit=10', { token }),
    ])
      .then(([rev, top]) => {
        setRevenue(rev.data || []);
        setTopItems(top.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center text-gray-500 py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4">Faturamento (últimos 7 dias)</h2>
        {revenue.length > 0 ? (
          <div className="space-y-2">
            {revenue.map((r) => (
              <div key={r.period} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{r.period}</span>
                <div className="flex items-center gap-8">
                  <span className="text-gray-500">{r.orders} pedidos</span>
                  <span className="font-medium w-24 text-right">{formatCurrency(r.revenue)}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t flex items-center justify-between font-bold">
              <span>Total</span>
              <span className="text-brand-600">
                {formatCurrency(revenue.reduce((s, r) => s + r.revenue, 0))}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum dado disponível.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4">🏆 Top 10 Itens (últimos 30 dias)</h2>
        {topItems.length > 0 ? (
          <div className="space-y-2">
            {topItems.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {item.name}
                </span>
                <div className="flex items-center gap-6">
                  <span className="text-gray-500">{item.quantity}x</span>
                  <span className="font-medium w-24 text-right">{formatCurrency(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum dado disponível.</p>
        )}
      </div>
    </div>
  );
}
