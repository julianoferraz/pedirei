import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import {
  Package,
  MapPin,
  Phone,
  Play,
  CheckCircle2,
  Clock,
  Truck,
  Navigation,
  RefreshCw,
} from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  deliveryAddress: string | null;
  deliveryRef: string | null;
  totalAmount: string;
  paymentMethod: string;
  needsChange: boolean;
  changeFor: string | null;
  generalNotes: string | null;
  createdAt: string;
  items: OrderItem[];
  customer: { name: string | null; phone: string };
}

interface Stats {
  todayDelivered: number;
  todayActive: number;
  totalDelivered: number;
}

const paymentLabels: Record<string, string> = {
  PIX_AUTO: 'PIX',
  PIX_DELIVERY: 'PIX na entrega',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  CASH: 'Dinheiro',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PREPARING: { label: 'Em preparo', color: 'bg-yellow-100 text-yellow-700' },
  OUT_FOR_DELIVERY: { label: 'Em rota', color: 'bg-blue-100 text-blue-700' },
  DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        apiFetch<{ data: Order[] }>('/api/delivery/my-orders?status=PREPARING', { token: token! }),
        apiFetch<{ data: Stats }>('/api/delivery/stats', { token: token! }),
      ]);
      // Also fetch out_for_delivery orders
      const activeRes = await apiFetch<{ data: Order[] }>('/api/delivery/my-orders?status=OUT_FOR_DELIVERY', { token: token! });
      setOrders([...activeRes.data, ...ordersRes.data]);
      setStats(statsRes.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // GPS tracking
  useEffect(() => {
    if (!token) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        apiFetch('/api/delivery/location', {
          method: 'POST',
          token: token!,
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  const handleAccept = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await apiFetch(`/api/delivery/orders/${orderId}/accept`, { method: 'POST', token: token! });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async (orderId: string) => {
    if (!confirm('Confirmar entrega?')) return;
    setActionLoading(orderId);
    try {
      await apiFetch(`/api/delivery/orders/${orderId}/confirm`, { method: 'POST', token: token! });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY');
  const pendingOrders = orders.filter((o) => o.status === 'PREPARING');

  return (
    <div className="space-y-4 pb-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Truck size={18} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{stats.todayActive}</p>
            <p className="text-xs text-gray-500">Em rota</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <CheckCircle2 size={18} className="mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{stats.todayDelivered}</p>
            <p className="text-xs text-gray-500">Hoje</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Package size={18} className="mx-auto text-brand-500 mb-1" />
            <p className="text-lg font-bold">{stats.totalDelivered}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      )}

      {/* Active deliveries */}
      {activeOrders.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase mb-2">Em rota ({activeOrders.length})</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                onConfirm={() => handleConfirm(order.id)}
                onOpenMaps={() => order.deliveryAddress && openMaps(order.deliveryAddress)}
                loading={actionLoading === order.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending (assigned but not picked up) */}
      {pendingOrders.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase mb-2">Aguardando ({pendingOrders.length})</h2>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                onAccept={() => handleAccept(order.id)}
                onOpenMaps={() => order.deliveryAddress && openMaps(order.deliveryAddress)}
                loading={actionLoading === order.id}
              />
            ))}
          </div>
        </div>
      )}

      {activeOrders.length === 0 && pendingOrders.length === 0 && (
        <div className="text-center py-16">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhuma entrega no momento</p>
          <p className="text-sm text-gray-400 mt-1">Novas entregas aparecerão aqui automaticamente</p>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onAccept,
  onConfirm,
  onOpenMaps,
  loading,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onAccept?: () => void;
  onConfirm?: () => void;
  onOpenMaps: () => void;
  loading: boolean;
}) {
  const st = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header — tappable */}
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">#{order.orderNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{order.customer.name || 'Cliente'}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">R$ {Number(order.totalAmount).toFixed(2)}</p>
          <p className="text-xs text-gray-400">{paymentLabels[order.paymentMethod] || order.paymentMethod}</p>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          {/* Address */}
          {order.deliveryAddress && (
            <button
              onClick={onOpenMaps}
              className="flex items-start gap-2 w-full text-left mt-3 p-2 bg-blue-50 rounded-lg"
            >
              <MapPin size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-700">{order.deliveryAddress}</p>
                {order.deliveryRef && <p className="text-xs text-blue-500">{order.deliveryRef}</p>}
                <p className="text-xs text-blue-400 mt-0.5 flex items-center gap-1">
                  <Navigation size={10} /> Abrir no Maps
                </p>
              </div>
            </button>
          )}

          {/* Phone */}
          <a
            href={`tel:${order.customer.phone}`}
            className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
          >
            <Phone size={16} className="text-green-600" />
            <span className="text-sm text-green-700">{order.customer.phone}</span>
          </a>

          {/* Items */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Itens</p>
            <ul className="text-sm space-y-0.5">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  {item.notes && <span className="text-xs text-gray-400 ml-2">({item.notes})</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Change info */}
          {order.needsChange && order.changeFor && (
            <div className="bg-yellow-50 p-2 rounded-lg text-sm text-yellow-700">
              💰 Troco para R$ {Number(order.changeFor).toFixed(2)}
            </div>
          )}

          {/* Notes */}
          {order.generalNotes && (
            <div className="bg-gray-50 p-2 rounded-lg text-sm text-gray-600">
              📝 {order.generalNotes}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {onAccept && order.status === 'PREPARING' && (
              <button
                onClick={onAccept}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
              >
                <Play size={16} /> {loading ? 'Saindo...' : 'Saí para entrega'}
              </button>
            )}
            {onConfirm && order.status === 'OUT_FOR_DELIVERY' && (
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
              >
                <CheckCircle2 size={16} /> {loading ? 'Confirmando...' : 'Entreguei'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
