import { useEffect, useState, useCallback } from 'react';
import { apiFetch, getToken } from '../lib/api';
import { toast } from 'sonner';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Play,
  ArrowRight,
  Timer,
  RefreshCw,
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  kdsStatus: 'PENDING' | 'PREPARING' | 'READY';
}

interface KdsOrder {
  id: string;
  orderNumber: number;
  status: string;
  createdAt: string;
  preparingAt: string | null;
  generalNotes: string | null;
  customer: { name: string | null; phone: string };
  items: OrderItem[];
}

interface KdsStats {
  received: number;
  preparing: number;
  completed: number;
  avgPrepMinutes: number;
}

const POLL_INTERVAL = 8000; // 8 seconds

export default function KdsPage() {
  const [receivedOrders, setReceivedOrders] = useState<KdsOrder[]>([]);
  const [preparingOrders, setPreparingOrders] = useState<KdsOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<KdsOrder[]>([]);
  const [stats, setStats] = useState<KdsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const token = getToken();

  const fetchOrders = useCallback(async () => {
    try {
      const [activeRes, completedRes, statsRes] = await Promise.all([
        apiFetch<{ data: KdsOrder[] }>('/api/kds/orders', { token }),
        apiFetch<{ data: KdsOrder[] }>('/api/kds/completed', { token }),
        apiFetch<{ data: KdsStats }>('/api/kds/stats', { token }),
      ]);

      const active = activeRes.data || [];
      setReceivedOrders(active.filter((o) => o.status === 'RECEIVED'));
      setPreparingOrders(active.filter((o) => o.status === 'PREPARING'));
      setCompletedOrders((completedRes.data || []).slice(0, 10));
      setStats(statsRes.data);
    } catch {
      // silent on poll errors
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleStart(orderId: string) {
    try {
      await apiFetch(`/api/kds/orders/${orderId}/start`, {
        token,
        method: 'PUT',
        body: JSON.stringify({}),
      });
      toast.success('Preparo iniciado!');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBump(orderId: string) {
    try {
      await apiFetch(`/api/kds/orders/${orderId}/bump`, {
        token,
        method: 'PUT',
        body: JSON.stringify({}),
      });
      toast.success('Pedido marcado como pronto!');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleItemStatus(itemId: string, kdsStatus: string) {
    try {
      await apiFetch(`/api/kds/items/${itemId}/status`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ kdsStatus }),
      });
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function elapsedMinutes(dateStr: string) {
    const diff = now - new Date(dateStr).getTime();
    return Math.floor(diff / 60000);
  }

  function formatElapsed(dateStr: string) {
    const mins = elapsedMinutes(dateStr);
    if (mins < 1) return '< 1 min';
    return `${mins} min`;
  }

  function timerColor(dateStr: string): string {
    const mins = elapsedMinutes(dateStr);
    if (mins < 10) return 'text-green-600';
    if (mins < 20) return 'text-yellow-600';
    return 'text-red-600';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="text-brand-600" size={24} />
          <h1 className="text-xl font-bold">KDS — Painel da Cozinha</h1>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Clock} label="Novos" value={stats.received} color="text-blue-600" bg="bg-blue-50" />
          <StatCard icon={ChefHat} label="Preparando" value={stats.preparing} color="text-orange-600" bg="bg-orange-50" />
          <StatCard icon={CheckCircle2} label="Prontos Hoje" value={stats.completed} color="text-green-600" bg="bg-green-50" />
          <StatCard icon={Timer} label="Tempo Médio" value={`${stats.avgPrepMinutes} min`} color="text-purple-600" bg="bg-purple-50" />
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
        {/* Column: Novos */}
        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Clock size={16} className="text-blue-600" />
            <h2 className="font-semibold text-blue-800">Novos</h2>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {receivedOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {receivedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                elapsed={formatElapsed(order.createdAt)}
                timerClass={timerColor(order.createdAt)}
                onItemStatus={handleItemStatus}
                action={
                  <button
                    onClick={() => handleStart(order.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    <Play size={14} />
                    Iniciar Preparo
                  </button>
                }
              />
            ))}
            {receivedOrders.length === 0 && (
              <p className="text-center text-sm text-blue-400 py-8">Nenhum pedido novo</p>
            )}
          </div>
        </div>

        {/* Column: Preparando */}
        <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100">
          <div className="flex items-center gap-2 mb-3 px-1">
            <ChefHat size={16} className="text-orange-600" />
            <h2 className="font-semibold text-orange-800">Preparando</h2>
            <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {preparingOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {preparingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                elapsed={formatElapsed(order.preparingAt || order.createdAt)}
                timerClass={timerColor(order.preparingAt || order.createdAt)}
                onItemStatus={handleItemStatus}
                action={
                  <button
                    onClick={() => handleBump(order.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    <ArrowRight size={14} />
                    Pronto!
                  </button>
                }
              />
            ))}
            {preparingOrders.length === 0 && (
              <p className="text-center text-sm text-orange-400 py-8">Nenhum pedido em preparo</p>
            )}
          </div>
        </div>

        {/* Column: Prontos */}
        <div className="bg-green-50/50 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-2 mb-3 px-1">
            <CheckCircle2 size={16} className="text-green-600" />
            <h2 className="font-semibold text-green-800">Prontos</h2>
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {completedOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-green-200 p-3 opacity-75"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-green-700">#{order.orderNumber}</span>
                  <span className="text-xs text-gray-500">
                    {order.customer.name || order.customer.phone}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                </div>
              </div>
            ))}
            {completedOrders.length === 0 && (
              <p className="text-center text-sm text-green-400 py-8">Nenhum pedido pronto</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: any;
  label: string;
  value: string | number;
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

function OrderCard({
  order,
  elapsed,
  timerClass,
  action,
  onItemStatus,
}: {
  order: KdsOrder;
  elapsed: string;
  timerClass: string;
  action: React.ReactNode;
  onItemStatus: (itemId: string, status: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">#{order.orderNumber}</span>
        <span className={`text-sm font-mono font-semibold ${timerClass}`}>
          <Timer size={14} className="inline mr-1" />
          {elapsed}
        </span>
      </div>

      {/* Customer */}
      <p className="text-xs text-gray-500">
        {order.customer.name || order.customer.phone}
      </p>

      {/* Items */}
      <div className="space-y-1">
        {order.items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 text-sm py-1 px-2 rounded ${
              item.kdsStatus === 'READY'
                ? 'bg-green-50 line-through text-gray-400'
                : item.kdsStatus === 'PREPARING'
                  ? 'bg-orange-50'
                  : 'bg-gray-50'
            }`}
          >
            <button
              onClick={() => {
                const next =
                  item.kdsStatus === 'PENDING'
                    ? 'PREPARING'
                    : item.kdsStatus === 'PREPARING'
                      ? 'READY'
                      : 'READY';
                onItemStatus(item.id, next);
              }}
              className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                item.kdsStatus === 'READY'
                  ? 'bg-green-500 border-green-500 text-white'
                  : item.kdsStatus === 'PREPARING'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              title={
                item.kdsStatus === 'PENDING'
                  ? 'Iniciar item'
                  : item.kdsStatus === 'PREPARING'
                    ? 'Marcar pronto'
                    : 'Pronto'
              }
            >
              {item.kdsStatus === 'READY' && <CheckCircle2 size={12} />}
              {item.kdsStatus === 'PREPARING' && <ChefHat size={12} />}
            </button>
            <span className="font-medium">{item.quantity}x</span>
            <span className="flex-1">{item.name}</span>
            {item.notes && (
              <span className="text-xs text-orange-600 italic">({item.notes})</span>
            )}
          </div>
        ))}
      </div>

      {/* General notes */}
      {order.generalNotes && (
        <p className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded">
          📝 {order.generalNotes}
        </p>
      )}

      {/* Action button */}
      {action}
    </div>
  );
}
