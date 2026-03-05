import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  Star,
  Gift,
  Users,
  History,
  Settings,
  Plus,
  Edit2,
  Trash2,
  X,
  Award,
  TrendingUp,
} from 'lucide-react';

interface LoyaltyConfig {
  loyaltyEnabled: boolean;
  loyaltyPointsPerReal: number;
  loyaltyMinOrderValue: number | null;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  type: 'FREE_ITEM' | 'DISCOUNT' | 'PERCENTAGE';
  discountValue: number | null;
  menuItemId: string | null;
  isActive: boolean;
}

interface LoyaltyTransaction {
  id: string;
  type: 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRE';
  points: number;
  balance: number;
  orderId: string | null;
  rewardId: string | null;
  description: string | null;
  createdAt: string;
  customer: { id: string; name: string | null; phone: string };
}

interface CustomerLoyalty {
  id: string;
  name: string | null;
  phone: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
}

const TX_TYPE_LABELS: Record<string, string> = {
  EARN: 'Ganho',
  REDEEM: 'Resgate',
  ADJUSTMENT: 'Ajuste',
  EXPIRE: 'Expirado',
};

const TX_TYPE_COLORS: Record<string, string> = {
  EARN: 'bg-green-100 text-green-700',
  REDEEM: 'bg-purple-100 text-purple-700',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
  EXPIRE: 'bg-gray-100 text-gray-500',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  FREE_ITEM: 'Item Grátis',
  DISCOUNT: 'Desconto (R$)',
  PERCENTAGE: 'Desconto (%)',
};

type Tab = 'config' | 'rewards' | 'customers' | 'transactions';

export default function LoyaltyPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('config');
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerLoyalty[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    pointsCost: '',
    type: 'FREE_ITEM' as 'FREE_ITEM' | 'DISCOUNT' | 'PERCENTAGE',
    discountValue: '',
    isActive: true,
  });

  // ── Fetchers ────────────────────────────────────────────

  const fetchConfig = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: LoyaltyConfig }>('/api/loyalty/config', { token })
      .then((res) => setConfig(res.data))
      .catch(() => toast.error('Erro ao carregar configuração'))
      .finally(() => setLoading(false));
  };

  const fetchRewards = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: LoyaltyReward[]; total: number }>(
      '/api/loyalty/rewards?limit=50',
      { token },
    )
      .then((res) => setRewards(res.data))
      .catch(() => toast.error('Erro ao carregar recompensas'))
      .finally(() => setLoading(false));
  };

  const fetchTransactions = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: LoyaltyTransaction[]; total: number }>(
      '/api/loyalty/transactions?limit=50',
      { token },
    )
      .then((res) => setTransactions(res.data))
      .catch(() => toast.error('Erro ao carregar transações'))
      .finally(() => setLoading(false));
  };

  const fetchCustomers = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: CustomerLoyalty[]; total: number }>(
      '/api/loyalty/customers?limit=50',
      { token },
    )
      .then((res) => setCustomers(res.data))
      .catch(() => toast.error('Erro ao carregar clientes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'config') fetchConfig();
    else if (tab === 'rewards') fetchRewards();
    else if (tab === 'transactions') fetchTransactions();
    else if (tab === 'customers') fetchCustomers();
  }, [token, tab]);

  // ── Handlers ────────────────────────────────────────────

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      const res = await apiFetch<{ success: boolean; data: LoyaltyConfig }>('/api/loyalty/config', {
        token,
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setConfig(res.data);
      toast.success('Configuração salva!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const openRewardModal = (reward?: LoyaltyReward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description || '',
        pointsCost: String(reward.pointsCost),
        type: reward.type,
        discountValue: reward.discountValue ? String(reward.discountValue) : '',
        isActive: reward.isActive,
      });
    } else {
      setEditingReward(null);
      setRewardForm({ name: '', description: '', pointsCost: '', type: 'FREE_ITEM', discountValue: '', isActive: true });
    }
    setShowRewardModal(true);
  };

  const handleSaveReward = async () => {
    const pointsCost = parseInt(rewardForm.pointsCost);
    if (!rewardForm.name || isNaN(pointsCost) || pointsCost <= 0) {
      toast.error('Preencha nome e pontos');
      return;
    }

    const payload: Record<string, unknown> = {
      name: rewardForm.name,
      description: rewardForm.description || undefined,
      pointsCost,
      type: rewardForm.type,
      isActive: rewardForm.isActive,
    };
    if (rewardForm.type !== 'FREE_ITEM' && rewardForm.discountValue) {
      payload.discountValue = parseFloat(rewardForm.discountValue);
    }

    try {
      if (editingReward) {
        await apiFetch(`/api/loyalty/rewards/${editingReward.id}`, {
          token,
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Recompensa atualizada!');
      } else {
        await apiFetch('/api/loyalty/rewards', {
          token,
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Recompensa criada!');
      }
      setShowRewardModal(false);
      fetchRewards();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm('Remover esta recompensa?')) return;
    try {
      await apiFetch(`/api/loyalty/rewards/${id}`, { token, method: 'DELETE' });
      toast.success('Removida!');
      fetchRewards();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover');
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Star }[] = [
    { key: 'config', label: 'Configuração', icon: Settings },
    { key: 'rewards', label: 'Recompensas', icon: Gift },
    { key: 'customers', label: 'Clientes', icon: Users },
    { key: 'transactions', label: 'Histórico', icon: History },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="h-7 w-7 text-brand-500" />
          Programa de Fidelidade
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── TAB: CONFIGURAÇÃO ───────────────────── */}
          {tab === 'config' && config && (
            <div className="bg-white rounded-xl border p-6 max-w-lg space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Ativar Fidelidade</h3>
                  <p className="text-sm text-gray-500">Clientes acumulam pontos a cada pedido</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, loyaltyEnabled: !config.loyaltyEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.loyaltyEnabled ? 'bg-brand-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      config.loyaltyEnabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pontos por R$ 1 gasto
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.loyaltyPointsPerReal}
                  onChange={(e) =>
                    setConfig({ ...config, loyaltyPointsPerReal: parseInt(e.target.value) || 1 })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ex: 1 = cliente ganha 1 ponto por R$1 gasto. 10 = ganha 10 pontos por R$1.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pedido mínimo para ganhar pontos (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={config.loyaltyMinOrderValue ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      loyaltyMinOrderValue: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Sem mínimo"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 text-sm font-medium"
              >
                Salvar Configuração
              </button>
            </div>
          )}

          {/* ── TAB: RECOMPENSAS ────────────────────── */}
          {tab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => openRewardModal()}
                  className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Nova Recompensa
                </button>
              </div>

              {!rewards.length ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma recompensa cadastrada.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Crie recompensas que os clientes podem resgatar com seus pontos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className={`bg-white rounded-xl border p-4 ${!reward.isActive ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-brand-500" />
                          <h4 className="font-semibold text-gray-900">{reward.name}</h4>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openRewardModal(reward)}
                            className="p-1 text-gray-400 hover:text-brand-500"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReward(reward.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {reward.description && (
                        <p className="text-sm text-gray-500 mb-2">{reward.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded-full font-medium">
                          {reward.pointsCost} pontos
                        </span>
                        <span className="text-xs text-gray-400">{REWARD_TYPE_LABELS[reward.type]}</span>
                      </div>
                      {reward.discountValue && reward.type !== 'FREE_ITEM' && (
                        <p className="text-sm text-gray-600 mt-1">
                          Valor: {reward.type === 'PERCENTAGE' ? `${reward.discountValue}%` : formatCurrency(Number(reward.discountValue))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CLIENTES ───────────────────────── */}
          {tab === 'customers' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-500" />
                <h3 className="font-semibold text-gray-900">Ranking de Fidelidade</h3>
              </div>
              {!customers.length ? (
                <div className="p-6 text-center text-gray-400">Nenhum cliente com pontos ainda.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">#</th>
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">Cliente</th>
                      <th className="px-4 py-2 text-right text-gray-500 font-medium">Pontos</th>
                      <th className="px-4 py-2 text-right text-gray-500 font-medium">Pedidos</th>
                      <th className="px-4 py-2 text-right text-gray-500 font-medium">Total Gasto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((c, i) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">{c.name || 'Sem nome'}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center gap-1 text-brand-600 font-semibold">
                            <Star className="h-3.5 w-3.5" />
                            {c.loyaltyPoints}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{c.totalOrders}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatCurrency(Number(c.totalSpent))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB: HISTÓRICO ──────────────────────── */}
          {tab === 'transactions' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Histórico de Pontos</h3>
              </div>
              {!transactions.length ? (
                <div className="p-6 text-center text-gray-400">Nenhuma transação registrada.</div>
              ) : (
                <div className="divide-y">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TX_TYPE_COLORS[tx.type]}`}>
                          {TX_TYPE_LABELS[tx.type]}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {tx.customer.name || tx.customer.phone}
                          </p>
                          <p className="text-xs text-gray-400">
                            {tx.description} • {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            tx.points > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {tx.points > 0 ? '+' : ''}
                          {tx.points} pts
                        </p>
                        <p className="text-xs text-gray-400">Saldo: {tx.balance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL: RECOMPENSA ──────────────────────── */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
              </h3>
              <button onClick={() => setShowRewardModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: Hambúrguer Grátis"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Descrição opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos Necessários</label>
                <input
                  type="number"
                  min={1}
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={rewardForm.type}
                  onChange={(e) =>
                    setRewardForm({
                      ...rewardForm,
                      type: e.target.value as 'FREE_ITEM' | 'DISCOUNT' | 'PERCENTAGE',
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="FREE_ITEM">Item Grátis</option>
                  <option value="DISCOUNT">Desconto em R$</option>
                  <option value="PERCENTAGE">Desconto em %</option>
                </select>
              </div>
              {rewardForm.type !== 'FREE_ITEM' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {rewardForm.type === 'PERCENTAGE' ? 'Percentual (%)' : 'Valor (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={rewardForm.discountValue}
                    onChange={(e) => setRewardForm({ ...rewardForm, discountValue: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reward-active"
                  checked={rewardForm.isActive}
                  onChange={(e) => setRewardForm({ ...rewardForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="reward-active" className="text-sm text-gray-700">
                  Ativa
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRewardModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveReward}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 text-sm font-medium"
              >
                {editingReward ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
