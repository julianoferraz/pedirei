import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Truck,
  Plus,
  MapPin,
  Clock,
  UserPlus,
  Package,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Driver {
  id: string;
  name: string;
  email: string;
  driverLat: string | null;
  driverLng: string | null;
  driverLocationAt: string | null;
  _count: { driverOrders: number };
}

interface PendingOrder {
  id: string;
  orderNumber: number;
  status: string;
  deliveryAddress: string | null;
  totalAmount: string;
  createdAt: string;
  customer: { name: string | null; phone: string };
  driver: { id: string; name: string } | null;
  items: { name: string; quantity: number }[];
}

export default function DeliveryPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [driversRes, pendingRes] = await Promise.all([
        apiFetch<{ data: Driver[] }>('/api/delivery/drivers'),
        apiFetch<{ data: PendingOrder[] }>('/api/delivery/pending'),
      ]);
      setDrivers(driversRes.data);
      setPending(pendingRes.data);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/delivery/drivers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Entregador criado');
      setShowForm(false);
      setFormData({ name: '', email: '', password: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (orderId: string, driverId: string) => {
    setAssigning(orderId);
    try {
      await apiFetch(`/api/delivery/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });
      toast.success('Entregador atribuído');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssigning(null);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getLocationAge = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    return `${Math.floor(mins / 60)}h atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    PREPARING: { label: 'Preparando', color: 'bg-yellow-100 text-yellow-700' },
    OUT_FOR_DELIVERY: { label: 'Em rota', color: 'bg-blue-100 text-blue-700' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck size={24} /> Entregas
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition text-sm"
        >
          <Plus size={16} /> Novo Entregador
        </button>
      </div>

      {/* Create driver form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <UserPlus size={18} /> Cadastrar Entregador
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm disabled:bg-gray-300"
              >
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drivers */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Entregadores ({drivers.length})</h2>
        {drivers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <Truck size={32} className="mx-auto mb-2 text-gray-300" />
            <p>Nenhum entregador cadastrado</p>
            <p className="text-sm text-gray-400">Clique em "Novo Entregador" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {drivers.map((driver) => {
              const locationAge = getLocationAge(driver.driverLocationAt);
              return (
                <div key={driver.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.email}</p>
                    </div>
                    {driver._count.driverOrders > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {driver._count.driverOrders} em rota
                      </span>
                    )}
                  </div>
                  {locationAge ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Navigation size={12} />
                      <span>GPS ativo — {locationAge}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={12} />
                      <span>Sem localização</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending deliveries */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Entregas Ativas ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <Package size={32} className="mx-auto mb-2 text-gray-300" />
            <p>Nenhuma entrega pendente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((order) => {
              const st = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
              return (
                <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">#{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {Number(order.totalAmount).toFixed(2)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock size={10} /> {formatTime(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    <p>{order.customer.name || 'Cliente'} — {order.customer.phone}</p>
                    {order.deliveryAddress && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {order.deliveryAddress}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {order.items.map((it, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        {it.quantity}x {it.name}
                      </span>
                    ))}
                  </div>

                  {/* Assign driver */}
                  <div className="flex items-center gap-2">
                    {order.driver ? (
                      <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                        🏍️ {order.driver.name}
                      </span>
                    ) : drivers.length > 0 ? (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleAssign(order.id, e.target.value);
                        }}
                        disabled={assigning === order.id}
                        className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                      >
                        <option value="">Atribuir entregador...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">Cadastre entregadores primeiro</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
