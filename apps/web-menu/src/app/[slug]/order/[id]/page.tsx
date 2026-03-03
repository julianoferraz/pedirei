'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
  notes?: string;
}

interface OrderTracking {
  id: string;
  orderNumber: number;
  status: string;
  subtotal: string | number;
  deliveryFee: string | number;
  totalAmount: string | number;
  paymentMethod: string;
  deliveryAddress?: string;
  generalNotes?: string;
  createdAt: string;
  preparingAt?: string;
  outDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  items: OrderItem[];
  tenant: {
    name: string;
    phone?: string;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode; step: number }
> = {
  RECEIVED: {
    label: 'Recebido',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: <Clock size={20} />,
    step: 0,
  },
  PREPARING: {
    label: 'Em preparo',
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    icon: <ChefHat size={20} />,
    step: 1,
  },
  OUT_FOR_DELIVERY: {
    label: 'Saiu para entrega',
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    icon: <Truck size={20} />,
    step: 2,
  },
  DELIVERED: {
    label: 'Entregue',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: <PackageCheck size={20} />,
    step: 3,
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: <XCircle size={20} />,
    step: -1,
  },
};

const TRACKING_STEPS = [
  { key: 'RECEIVED', label: 'Recebido' },
  { key: 'PREPARING', label: 'Em preparo' },
  { key: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega' },
  { key: 'DELIVERED', label: 'Entregue' },
];

const PAYMENT_LABELS: Record<string, string> = {
  PIX_AUTO: 'PIX (automático)',
  PIX_DELIVERY: 'PIX na entrega',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  CASH: 'Dinheiro',
};

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: OrderTracking }>(
        `/api/orders/${orderId}/track`,
        { next: { revalidate: 0 } as any },
      );
      setOrder(res.data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Pedido não encontrado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 15 seconds for updates
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-gray-500">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <XCircle size={48} className="text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-700">Pedido não encontrado</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={() => router.push(`/${slug}`)}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            Voltar ao cardápio
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.RECEIVED;
  const isFinal = order.status === 'DELIVERED' || order.status === 'CANCELLED';
  const currentStep = statusInfo.step;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/${slug}`)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Pedido #{order.orderNumber}</h1>
            <p className="text-xs text-gray-500">{order.tenant.name}</p>
          </div>
          {!isFinal && (
            <button
              onClick={fetchOrder}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Atualizar"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status Badge */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 ${statusInfo.bg} rounded-full mb-3`}
          >
            <span className={statusInfo.color}>{statusInfo.icon}</span>
          </div>
          <h2 className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.label}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {order.status === 'CANCELLED' && order.cancelReason && (
            <p className="text-sm text-red-500 mt-2">Motivo: {order.cancelReason}</p>
          )}
        </div>

        {/* Progress tracker */}
        {order.status !== 'CANCELLED' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="relative">
              {TRACKING_STEPS.map((ts, i) => {
                const isActive = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div key={ts.key} className="flex items-start gap-3 relative">
                    {/* Line */}
                    {i < TRACKING_STEPS.length - 1 && (
                      <div
                        className={`absolute top-6 left-3 w-0.5 h-8 ${
                          i < currentStep ? 'bg-brand-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    {/* Dot */}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-brand-500' : 'bg-gray-200'
                      }`}
                    >
                      {isActive && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    {/* Label */}
                    <div className={`pb-8 ${isCurrent ? 'font-semibold' : ''}`}>
                      <span className={isActive ? 'text-gray-800' : 'text-gray-400'}>
                        {ts.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-sm text-gray-800 mb-3">Itens do pedido</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            {Number(order.deliveryFee) > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa de entrega</span>
                <span>{formatCurrency(Number(order.deliveryFee))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span className="text-brand-600">{formatCurrency(Number(order.totalAmount))}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 text-sm">
          <h3 className="font-semibold text-gray-800">Detalhes</h3>
          <div className="flex justify-between">
            <span className="text-gray-500">Pagamento</span>
            <span className="font-medium">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between">
              <span className="text-gray-500">Endereço</span>
              <span className="font-medium text-right max-w-[60%]">{order.deliveryAddress}</span>
            </div>
          )}
          {order.generalNotes && (
            <div className="flex justify-between">
              <span className="text-gray-500">Observações</span>
              <span className="text-right max-w-[60%]">{order.generalNotes}</span>
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => router.push(`/${slug}`)}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition"
        >
          Voltar ao cardápio
        </button>

        {!isFinal && (
          <p className="text-xs text-center text-gray-400">
            Esta página atualiza automaticamente a cada 15 segundos
          </p>
        )}
      </div>
    </div>
  );
}
