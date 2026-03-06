'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { apiFetch, type TenantInfo } from '@/lib/api';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  ShoppingBag,
  CheckCircle,
  Loader2,
  User,
  Phone,
  FileText,
  Banknote,
  QrCode,
  UtensilsCrossed,
} from 'lucide-react';

type PaymentMethod = 'PIX_AUTO' | 'PIX_DELIVERY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH';

interface CheckoutForm {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryRef: string;
  paymentMethod: PaymentMethod;
  needsChange: boolean;
  changeFor: string;
  generalNotes: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  PIX_AUTO: { label: 'PIX (automático)', icon: <QrCode size={18} /> },
  PIX_DELIVERY: { label: 'PIX na entrega', icon: <QrCode size={18} /> },
  CREDIT_CARD: { label: 'Cartão de crédito', icon: <CreditCard size={18} /> },
  DEBIT_CARD: { label: 'Cartão de débito', icon: <CreditCard size={18} /> },
  CASH: { label: 'Dinheiro', icon: <Banknote size={18} /> },
};

const STEPS = ['Carrinho', 'Entrega', 'Pagamento', 'Confirmação'];

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const mesa = searchParams.get('mesa');
  const cart = useCart();

  const [step, setStep] = useState(0);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const [form, setForm] = useState<CheckoutForm>({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryRef: '',
    paymentMethod: 'PIX_DELIVERY',
    needsChange: false,
    changeFor: '',
    generalNotes: '',
  });

  useEffect(() => {
    apiFetch<{ success: boolean; data: TenantInfo }>(`/api/public/${slug}/info`)
      .then((res) => setTenantInfo(res.data))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (cart.count === 0 && !orderId) {
      router.push(`/${slug}`);
    }
  }, [cart.count, orderId, slug, router]);

  const updateForm = (field: keyof CheckoutForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canAdvance = useCallback(() => {
    if (step === 0) return cart.count > 0;
    if (step === 1) return form.customerName.length >= 2 && form.customerPhone.length >= 10;
    if (step === 2) return !!form.paymentMethod;
    return false;
  }, [step, cart.count, form]);

  const submitOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const body = {
        items: cart.items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        customerName: form.customerName,
        customerPhone: form.customerPhone.replace(/\D/g, ''),
        deliveryAddress: form.deliveryAddress || undefined,
        deliveryRef: form.deliveryRef || undefined,
        paymentMethod: form.paymentMethod,
        needsChange: form.needsChange,
        changeFor: form.needsChange && form.changeFor ? parseFloat(form.changeFor) : undefined,
        generalNotes: form.generalNotes || undefined,
      };

      const res = await apiFetch<{ success: boolean; data: { id: string; orderNumber: number } }>(
        '/api/orders',
        {
          method: 'POST',
          headers: { 'x-tenant-slug': slug },
          body: JSON.stringify(body),
        },
      );

      setOrderId(res.data.id);
      setOrderNumber(res.data.orderNumber);
      cart.clear();
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      submitOrder();
    } else if (step < 3) {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {step < 3 ? (
            <button
              onClick={() => (step === 0 ? router.push(`/${slug}`) : setStep(step - 1))}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <h1 className="font-bold text-lg flex-1">
            {step < 3 ? 'Finalizar Pedido' : 'Pedido Enviado!'}
          </h1>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="flex gap-1">
              {STEPS.slice(0, 3).map((s, i) => (
                <div key={s} className="flex-1">
                  <div
                    className={`h-1 rounded-full transition ${
                      i <= step ? 'bg-brand-500' : 'bg-gray-200'
                    }`}
                  />
                  <p
                    className={`text-xs mt-1 text-center ${
                      i <= step ? 'text-brand-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {s}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 0: Cart Review */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingBag size={18} /> Revise seu pedido
            </h2>
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {cart.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-500">
                      {item.quantity}x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 border rounded-lg">
                      <button
                        onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                      >
                        −
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-brand-600 w-20 text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
              {tenantInfo?.deliveryFee ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Taxa de entrega</span>
                  <span>{formatCurrency(tenantInfo.deliveryFee)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-brand-600">
                  {formatCurrency(cart.total + (tenantInfo?.deliveryFee || 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Delivery / Customer Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <User size={18} /> Seus dados
            </h2>
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" /> Nome *
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                  placeholder="Seu nome"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={14} className="inline mr-1" /> Telefone *
                </label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => updateForm('customerPhone', e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>

              {tenantInfo?.acceptsDelivery && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin size={14} className="inline mr-1" /> Endereço de entrega
                    </label>
                    <input
                      type="text"
                      value={form.deliveryAddress}
                      onChange={(e) => updateForm('deliveryAddress', e.target.value)}
                      placeholder="Rua, número, bairro"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ponto de referência
                    </label>
                    <input
                      type="text"
                      value={form.deliveryRef}
                      onChange={(e) => updateForm('deliveryRef', e.target.value)}
                      placeholder="Próximo a..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText size={14} className="inline mr-1" /> Observações
                </label>
                <textarea
                  value={form.generalNotes}
                  onChange={(e) => updateForm('generalNotes', e.target.value)}
                  placeholder="Alguma observação geral? (opcional)"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard size={18} /> Forma de pagamento
            </h2>
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              {(tenantInfo?.paymentMethods || ['PIX_DELIVERY', 'CASH']).map((method) => {
                const pm = method as PaymentMethod;
                const info = PAYMENT_LABELS[pm];
                if (!info) return null;
                return (
                  <button
                    key={pm}
                    onClick={() => updateForm('paymentMethod', pm)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      form.paymentMethod === pm
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={form.paymentMethod === pm ? 'text-brand-600' : 'text-gray-400'}>
                      {info.icon}
                    </span>
                    <span className={`text-sm font-medium ${form.paymentMethod === pm ? 'text-brand-700' : 'text-gray-700'}`}>
                      {info.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {form.paymentMethod === 'CASH' && (
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.needsChange}
                    onChange={(e) => updateForm('needsChange', e.target.checked)}
                    className="accent-brand-500"
                  />
                  Preciso de troco
                </label>
                {form.needsChange && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Troco para quanto?
                    </label>
                    <input
                      type="number"
                      value={form.changeFor}
                      onChange={(e) => updateForm('changeFor', e.target.value)}
                      placeholder="Ex: 50.00"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Resumo do pedido</h3>
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total</span>
                <span className="text-brand-600">
                  {formatCurrency(cart.total + (tenantInfo?.deliveryFee || 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && orderId && (
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Pedido enviado!</h2>
              <p className="text-gray-500 mt-1">
                Pedido #{orderNumber} recebido com sucesso
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nome</span>
                <span className="font-medium">{form.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pagamento</span>
                <span className="font-medium">{PAYMENT_LABELS[form.paymentMethod]?.label}</span>
              </div>
              {form.deliveryAddress && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Endereço</span>
                  <span className="font-medium text-right max-w-[60%]">{form.deliveryAddress}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/${slug}/order/${orderId}`)}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold transition"
              >
                Acompanhar pedido
              </button>
              <button
                onClick={() => router.push(`/${slug}`)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition"
              >
                Voltar ao cardápio
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Navigation button */}
        {step < 3 && (
          <div className="mt-6">
            <button
              onClick={handleNext}
              disabled={!canAdvance() || loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Enviando...
                </>
              ) : step === 2 ? (
                <>
                  <CheckCircle size={18} /> Confirmar pedido
                </>
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
