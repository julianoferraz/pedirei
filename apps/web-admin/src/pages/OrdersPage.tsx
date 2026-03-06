import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  deliveryAddress?: string;
  orderType?: 'DELIVERY' | 'PICKUP' | 'TABLE';
  tableNumber?: string | null;
  createdAt: string;
  customer: { name?: string; phone: string };
  items: Array<{ quantity: number; menuItem: { name: string }; unitPrice: number }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Recebido', color: 'bg-blue-100 text-blue-800' },
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  PREPARING: { label: 'Preparando', color: 'bg-orange-100 text-orange-800' },
  READY: { label: 'Pronto', color: 'bg-green-100 text-green-800' },
  OUT_FOR_DELIVERY: { label: 'Saiu p/ entrega', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Entregue', color: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const statuses =
        filter === 'active'
          ? 'PENDING,CONFIRMED,PREPARING,READY,OUT_FOR_DELIVERY'
          : filter === 'delivered'
            ? 'DELIVERED'
            : 'CANCELLED';
      const res = await apiFetch<{ data: { data: Order[] } }>(
        `/api/orders?status=${statuses}&limit=50`,
        { token },
      );
      setOrders(res.data.data || []);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter, token]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter, token]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token,
      });
      toast.success('Status atualizado');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button onClick={fetchOrders} className="p-2 hover:bg-gray-100 rounded-lg" title="Atualizar">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Ativos' },
          { key: 'delivered', label: 'Entregues' },
          { key: 'cancelled', label: 'Cancelados' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {loading && orders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Carregando...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Nenhum pedido encontrado.</div>
        ) : (
          orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100' };
            const nextStatus = NEXT_STATUS[order.status];

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-bold text-lg">#{order.orderNumber}</span>
                    <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  {order.orderType === 'TABLE' && order.tableNumber ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                      🍽️ Mesa {order.tableNumber}
                    </span>
                  ) : (
                    <span>📱</span>
                  )}
                  <span>{order.customer.name || order.customer.phone}</span>
                </div>

                <div className="text-sm space-y-1 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.quantity}x {item.menuItem.name}</span>
                      <span className="text-gray-500">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {order.deliveryAddress && (
                  <p className="text-xs text-gray-500 mb-2">📍 {order.deliveryAddress}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-bold text-brand-600">{formatCurrency(order.total)}</span>
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => updateStatus(order.id, 'CANCELLED')}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                      >
                        Cancelar
                      </button>
                    )}
                    {nextStatus && (
                      <button
                        onClick={() => updateStatus(order.id, nextStatus)}
                        className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
                      >
                        {STATUS_LABELS[nextStatus]?.label || nextStatus}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
