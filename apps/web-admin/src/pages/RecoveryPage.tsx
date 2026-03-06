import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  RotateCcw,
  Settings,
  TrendingUp,
  Ban,
  CheckCircle2,
  MessageSquare,
  Clock,
  Percent,
} from 'lucide-react';

interface RecoverySettings {
  recoveryEnabled: boolean;
  recoveryDelayMin: number;
  recoveryMessage: string;
  recoveryDiscountPct: number;
}

interface RecoveryStats {
  cancelledCount: number;
  attemptCount: number;
  recoveredCount: number;
  revenueRecovered: number;
  conversionRate: number;
}

interface RecoveryAttempt {
  id: string;
  message: string;
  sentAt: string;
  recovered: boolean;
  recoveredAt: string | null;
  order: { orderNumber: number; totalAmount: number; cancelledAt: string };
  customer: { name: string | null; phone: string };
}

type Tab = 'dashboard' | 'settings';

export default function RecoveryPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settings, setSettings] = useState<RecoverySettings | null>(null);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [attempts, setAttempts] = useState<RecoveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState(30);

  const fetchSettings = () =>
    apiFetch<{ success: boolean; data: RecoverySettings }>('/api/recovery/settings', { token })
      .then((r) => setSettings(r.data))
      .catch(() => toast.error('Erro ao carregar configurações'));

  const fetchStats = () =>
    apiFetch<{ success: boolean; data: RecoveryStats }>(`/api/recovery/stats?days=${days}`, {
      token,
    })
      .then((r) => setStats(r.data))
      .catch(() => toast.error('Erro ao carregar estatísticas'));

  const fetchAttempts = () =>
    apiFetch<{ success: boolean; data: RecoveryAttempt[] }>('/api/recovery/attempts', { token })
      .then((r) => setAttempts(r.data))
      .catch(() => toast.error('Erro ao carregar tentativas'));

  useEffect(() => {
    Promise.all([fetchSettings(), fetchStats(), fetchAttempts()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [days]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch('/api/recovery/settings', {
        token,
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      toast.success('Configurações salvas');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { key: Tab; icon: typeof TrendingUp; label: string }[] = [
    { key: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
    { key: 'settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RotateCcw className="text-brand-600" size={28} />
          Recuperação de Vendas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Recupere pedidos cancelados enviando mensagens automáticas via WhatsApp
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <>
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Período:</span>
            {[7, 15, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm ${
                  days === d
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              icon={Ban}
              label="Cancelados"
              value={String(stats.cancelledCount)}
              color="text-red-600"
              bg="bg-red-50"
            />
            <KpiCard
              icon={MessageSquare}
              label="Msgs Enviadas"
              value={String(stats.attemptCount)}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Recuperados"
              value={String(stats.recoveredCount)}
              color="text-green-600"
              bg="bg-green-50"
            />
            <KpiCard
              icon={TrendingUp}
              label="Receita Recuperada"
              value={formatCurrency(stats.revenueRecovered)}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              icon={Percent}
              label="Conversão"
              value={`${stats.conversionRate.toFixed(1)}%`}
              color="text-purple-600"
              bg="bg-purple-50"
            />
          </div>

          {/* Recent attempts */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Tentativas Recentes</h2>
            </div>
            {attempts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Nenhuma tentativa de recuperação ainda
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="p-3">Pedido</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Cancelado em</th>
                      <th className="p-3">Msg Enviada</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 font-medium">#{a.order.orderNumber}</td>
                        <td className="p-3">{a.customer.name || a.customer.phone}</td>
                        <td className="p-3">{formatCurrency(a.order.totalAmount)}</td>
                        <td className="p-3 text-gray-500">
                          {formatDate(a.order.cancelledAt)}
                        </td>
                        <td className="p-3 text-gray-500">{formatDate(a.sentAt)}</td>
                        <td className="p-3">
                          {a.recovered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle2 size={12} /> Recuperado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              <Clock size={12} /> Aguardando
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'settings' && settings && (
        <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Recuperação automática</p>
              <p className="text-sm text-gray-500">
                Enviar mensagem WhatsApp quando um pedido for cancelado
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, recoveryEnabled: !settings.recoveryEnabled })}
              className={`relative w-12 h-6 rounded-full transition ${
                settings.recoveryEnabled ? 'bg-brand-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.recoveryEnabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tempo de espera (minutos)
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Tempo após o cancelamento para enviar a mensagem de recuperação
            </p>
            <input
              type="number"
              min={5}
              max={1440}
              value={settings.recoveryDelayMin}
              onChange={(e) =>
                setSettings({ ...settings, recoveryDelayMin: Number(e.target.value) || 30 })
              }
              className="w-32 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desconto de recuperação (%)
            </label>
            <p className="text-xs text-gray-400 mb-2">
              0 = sem desconto. O cupom VOLTAR será mencionado na mensagem.
            </p>
            <input
              type="number"
              min={0}
              max={50}
              value={settings.recoveryDiscountPct}
              onChange={(e) =>
                setSettings({ ...settings, recoveryDiscountPct: Number(e.target.value) || 0 })
              }
              className="w-32 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Message template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem de recuperação
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Variáveis: {'{nome}'} = nome do cliente, {'{loja}'} = nome da loja, {'{pedido}'} =
              número do pedido
            </p>
            <textarea
              rows={4}
              value={settings.recoveryMessage}
              onChange={(e) => setSettings({ ...settings, recoveryMessage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
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
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
        <Icon size={20} className={color} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
