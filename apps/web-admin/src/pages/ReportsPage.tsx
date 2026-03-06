import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  CreditCard,
  Users,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

interface RevenueReport {
  total: number;
  orderCount: number;
  avgTicket: number;
  daily: { date: string; revenue: number }[];
}

interface TopItem {
  name: string;
  totalQuantity: number;
  orderCount: number;
}

interface PeakHour {
  hour: number;
  orders: number;
}

interface FeedbackReport {
  total: number;
  average: number;
  distribution: { rating: number; count: number }[];
  recent: { feedbackRating: number; feedbackComment: string | null; feedbackAt: string }[];
}

interface PaymentBreakdown {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  topCustomers: { name: string | null; phone: string; orders: number; spent: number }[];
}

interface OrderStatusItem {
  status: string;
  count: number;
  total: number;
  percentage: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  PIX_AUTO: 'Pix (Automático)',
  PIX_DELIVERY: 'Pix (Entrega)',
  CREDIT_CARD: 'Cartão Crédito',
  DEBIT_CARD: 'Cartão Débito',
  CASH: 'Dinheiro',
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recebidos',
  PREPARING: 'Preparando',
  OUT_FOR_DELIVERY: 'Em Entrega',
  DELIVERED: 'Entregues',
  CANCELLED: 'Cancelados',
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function getDateRange(range: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 7);
  }
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  // Basic reports
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);

  // Advanced reports
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatusItem[]>([]);
  const [advError, setAdvError] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange(range);
    const qs = `startDate=${startDate}&endDate=${endDate}`;

    try {
      const [revRes, topRes, peakRes, fbRes] = await Promise.all([
        apiFetch<{ data: RevenueReport }>(`/api/reports/revenue?${qs}`, { token }),
        apiFetch<{ data: TopItem[] }>(`/api/reports/top-items?${qs}&limit=10`, { token }),
        apiFetch<{ data: PeakHour[] }>(`/api/reports/peak-hours?${qs}`, { token }),
        apiFetch<{ data: FeedbackReport }>(`/api/reports/feedback?${qs}`, { token }),
      ]);
      setRevenue(revRes.data);
      setTopItems(topRes.data || []);
      setPeakHours(peakRes.data || []);
      setFeedback(fbRes.data);
    } catch {
      // plan may not allow basic reports
    }

    // Advanced reports (may fail if plan doesn't include)
    try {
      const [payRes, custRes, statusRes] = await Promise.all([
        apiFetch<{ data: PaymentBreakdown[] }>(`/api/reports/payment-breakdown?${qs}`, { token }),
        apiFetch<{ data: CustomerAnalytics }>(`/api/reports/customer-analytics?${qs}`, { token }),
        apiFetch<{ data: OrderStatusItem[] }>(`/api/reports/order-status?${qs}`, { token }),
      ]);
      setPaymentBreakdown(payRes.data || []);
      setCustomerAnalytics(custRes.data);
      setOrderStatus(statusRes.data || []);
      setAdvError(false);
    } catch {
      setAdvError(true);
    }

    setLoading(false);
  }, [token, range]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  const maxPeakOrders = Math.max(...peakHours.map((h) => h.orders), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-brand-600" size={24} />
          <h1 className="text-xl font-bold">Relatórios</h1>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          {['7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                range === r
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r === '7d' ? '7 dias' : r === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {revenue && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={TrendingUp}
            label="Faturamento"
            value={formatCurrency(revenue.total)}
            color="text-green-600"
            bg="bg-green-50"
          />
          <KpiCard
            icon={BarChart3}
            label="Pedidos"
            value={String(revenue.orderCount)}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KpiCard
            icon={CreditCard}
            label="Ticket Médio"
            value={formatCurrency(revenue.avgTicket)}
            color="text-purple-600"
            bg="bg-purple-50"
          />
          <KpiCard
            icon={Star}
            label="Nota Média"
            value={feedback ? `${feedback.average.toFixed(1)} ⭐` : '—'}
            color="text-yellow-600"
            bg="bg-yellow-50"
          />
        </div>
      )}

      {/* Row 1: Revenue Chart + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Revenue */}
        {revenue && revenue.daily.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600" />
              Faturamento Diário
            </h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {revenue.daily.map((d) => {
                const maxRev = Math.max(...revenue.daily.map((x) => x.revenue), 1);
                const pct = (d.revenue / maxRev) * 100;
                return (
                  <div key={d.date} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-gray-500 text-xs shrink-0">
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-medium text-xs">{formatCurrency(d.revenue)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Items */}
        {topItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-3">🏆 Top 10 Itens</h2>
            <div className="space-y-2">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="truncate max-w-[200px]">{item.name}</span>
                  </span>
                  <span className="text-gray-500 font-medium">{item.totalQuantity}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Peak Hours + Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peak Hours */}
        {peakHours.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-600" />
              Horários de Pico
            </h2>
            <div className="flex items-end gap-[3px] h-32">
              {peakHours.map((h) => {
                const pct = (h.orders / maxPeakOrders) * 100;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                    <div
                      className="w-full bg-orange-400 rounded-t hover:bg-orange-500 transition-colors cursor-default"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${h.hour}h: ${h.orders} pedidos`}
                    />
                    {h.hour % 3 === 0 && (
                      <span className="text-[10px] text-gray-400 mt-0.5">{h.hour}h</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              Avaliações ({feedback.total})
            </h2>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl font-bold text-yellow-600">{feedback.average.toFixed(1)}</span>
              <div className="flex-1 space-y-1">
                {feedback.distribution
                  .slice()
                  .reverse()
                  .map((d) => {
                    const pct = feedback.total > 0 ? (d.count / feedback.total) * 100 : 0;
                    return (
                      <div key={d.rating} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-gray-500">{d.rating}★</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-gray-400 text-right">{d.count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Reports Section */}
      {advError ? (
        <div className="bg-gray-50 border rounded-xl p-6 text-center">
          <AlertTriangle size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            Relatórios avançados disponíveis no plano Profissional ou superior.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold border-t pt-4">Relatórios Avançados</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Payment Breakdown */}
            {paymentBreakdown.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard size={16} className="text-purple-600" />
                  Formas de Pagamento
                </h3>
                <div className="space-y-2">
                  {paymentBreakdown.map((p) => (
                    <div key={p.method} className="text-sm">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-gray-700">{PAYMENT_LABELS[p.method] || p.method}</span>
                        <span className="font-medium">{p.percentage}%</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                        <span>{p.count} pedidos</span>
                        <span>{formatCurrency(p.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Analytics */}
            {customerAnalytics && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Análise de Clientes
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-700">{customerAnalytics.totalCustomers}</p>
                    <p className="text-[10px] text-blue-500">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-700">{customerAnalytics.returningCustomers}</p>
                    <p className="text-[10px] text-green-500">Recorrentes</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-purple-700">{customerAnalytics.newCustomers}</p>
                    <p className="text-[10px] text-purple-500">Novos</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-orange-700">{customerAnalytics.retentionRate}%</p>
                    <p className="text-[10px] text-orange-500">Retenção</p>
                  </div>
                </div>
                {customerAnalytics.topCustomers.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-500 mb-1">Top Clientes por Receita</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {customerAnalytics.topCustomers.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[140px]">{c.name || c.phone}</span>
                          <span className="text-gray-500">{c.orders}x</span>
                          <span className="font-medium">{formatCurrency(c.spent)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Order Status */}
            {orderStatus.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-gray-600" />
                  Status dos Pedidos
                </h3>
                <div className="space-y-2">
                  {orderStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{s.count}</span>
                        <span className="font-medium w-16 text-right">{formatCurrency(s.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-3 flex items-center gap-3`}>
      <Icon size={20} className={color} />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
