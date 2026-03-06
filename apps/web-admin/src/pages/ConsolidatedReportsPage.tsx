import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import {
  Building2,
  TrendingUp,
  BarChart3,
  CreditCard,
  Users,
  Plus,
  Trash2,
  UserPlus,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────

interface GroupMember {
  id: string;
  tenantId: string;
  role: 'HEADQUARTERS' | 'BRANCH';
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
}

interface Group {
  id: string;
  name: string;
  ownerTenantId: string;
  myRole: 'HEADQUARTERS' | 'BRANCH';
  members: GroupMember[];
}

interface BranchRevenue {
  tenantId: string;
  name: string;
  total: number;
  orderCount: number;
  avgTicket: number;
}

interface ConsolidatedRevenue {
  grandTotal: number;
  totalOrders: number;
  avgTicket: number;
  daily: { date: string; revenue: number }[];
  branches: BranchRevenue[];
}

interface TopItem {
  name: string;
  totalQuantity: number;
  orderCount: number;
}

interface PaymentBreakdown {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

interface OrderStatusItem {
  status: string;
  count: number;
  total: number;
  percentage: number;
}

interface ConsolidatedCustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  crossBranchCustomers: number;
  topCustomers: { name: string | null; phone: string; orders: number; spent: number; branchCount: number }[];
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

// ─── Main Component ───────────────────────────────────────

export default function ConsolidatedReportsPage() {
  const { token } = useAuth();

  // Group management state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberSlug, setNewMemberSlug] = useState('');

  // Report state
  const [range, setRange] = useState('30d');
  const [loadingReports, setLoadingReports] = useState(false);
  const [revenue, setRevenue] = useState<ConsolidatedRevenue | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusItem[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<ConsolidatedCustomerAnalytics | null>(null);

  // ─── Group CRUD ─────────────────────────────────────────

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await apiFetch<{ data: Group[] }>('/api/multi-unit/groups', { token });
      setGroups(res.data || []);
      if (res.data?.length > 0 && !selectedGroupId) {
        setSelectedGroupId(res.data[0].id);
      }
    } catch {
      // plan may not allow
    }
    setLoadingGroups(false);
  }, [token, selectedGroupId]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await apiFetch('/api/multi-unit/groups', {
        token,
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      toast.success('Grupo criado com sucesso!');
      setNewGroupName('');
      setShowCreateGroup(false);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar grupo');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
    try {
      await apiFetch(`/api/multi-unit/groups/${groupId}`, { token, method: 'DELETE' });
      toast.success('Grupo excluído');
      if (selectedGroupId === groupId) setSelectedGroupId('');
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  const handleAddMember = async (groupId: string) => {
    if (!newMemberSlug.trim()) return;
    try {
      await apiFetch(`/api/multi-unit/groups/${groupId}/members`, {
        token,
        method: 'POST',
        body: JSON.stringify({ slug: newMemberSlug.trim() }),
      });
      toast.success('Filial adicionada!');
      setNewMemberSlug('');
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar filial');
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    try {
      await apiFetch(`/api/multi-unit/groups/${groupId}/members/${memberId}`, {
        token,
        method: 'DELETE',
      });
      toast.success('Filial removida');
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover filial');
    }
  };

  // ─── Reports ────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    if (!selectedGroupId) return;
    setLoadingReports(true);
    const { startDate, endDate } = getDateRange(range);
    const qs = `startDate=${startDate}&endDate=${endDate}`;
    const base = `/api/multi-unit/groups/${selectedGroupId}/reports`;

    try {
      const [revRes, topRes, payRes, statusRes, custRes] = await Promise.all([
        apiFetch<{ data: ConsolidatedRevenue }>(`${base}/revenue?${qs}`, { token }),
        apiFetch<{ data: TopItem[] }>(`${base}/top-items?${qs}&limit=10`, { token }),
        apiFetch<{ data: PaymentBreakdown[] }>(`${base}/payment-breakdown?${qs}`, { token }),
        apiFetch<{ data: OrderStatusItem[] }>(`${base}/order-status?${qs}`, { token }),
        apiFetch<{ data: ConsolidatedCustomerAnalytics }>(`${base}/customer-analytics?${qs}`, { token }),
      ]);
      setRevenue(revRes.data);
      setTopItems(topRes.data || []);
      setPaymentBreakdown(payRes.data || []);
      setOrderStatus(statusRes.data || []);
      setCustomerAnalytics(custRes.data);
    } catch {
      toast.error('Erro ao carregar relatórios consolidados');
    }
    setLoadingReports(false);
  }, [token, selectedGroupId, range]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) fetchReports();
  }, [fetchReports, selectedGroupId]);

  // ─── Loading / Empty states ─────────────────────────────

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const isHQ = selectedGroup?.myRole === 'HEADQUARTERS';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="text-brand-600" size={24} />
          <h1 className="text-xl font-bold">Filiais — Relatório Consolidado</h1>
        </div>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          <Plus size={16} /> Novo Grupo
        </button>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-brand-100">
          <h2 className="font-semibold mb-3">Criar Grupo de Filiais</h2>
          <div className="flex gap-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do grupo (ex: Rede Pizzaria Central)"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <button
              onClick={handleCreateGroup}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
            >
              Criar
            </button>
            <button
              onClick={() => setShowCreateGroup(false)}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* No groups yet */}
      {groups.length === 0 && !showCreateGroup && (
        <div className="bg-gray-50 border rounded-xl p-10 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-2">Nenhum grupo de filiais criado.</p>
          <p className="text-sm text-gray-400">
            Crie um grupo e adicione as lojas para ver relatórios consolidados.
          </p>
        </div>
      )}

      {/* Group Selector + Members */}
      {groups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <label className="text-sm font-medium text-gray-600">Grupo:</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.length} filiais)
                </option>
              ))}
            </select>

            {isHQ && (
              <button
                onClick={() => handleDeleteGroup(selectedGroupId)}
                className="text-red-500 hover:text-red-700 ml-auto"
                title="Excluir grupo"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Members list */}
          {selectedGroup && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Lojas do Grupo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedGroup.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{m.tenant.name}</span>
                      <span className="text-gray-400 ml-1 text-xs">/{m.tenant.slug}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        m.role === 'HEADQUARTERS'
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {m.role === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}
                    </span>
                    {isHQ && m.role !== 'HEADQUARTERS' && (
                      <button
                        onClick={() => handleRemoveMember(selectedGroupId, m.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add member */}
              {isHQ && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newMemberSlug}
                    onChange={(e) => setNewMemberSlug(e.target.value)}
                    placeholder="Slug da loja para adicionar (ex: pizzaria-centro)"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember(selectedGroupId)}
                  />
                  <button
                    onClick={() => handleAddMember(selectedGroupId)}
                    className="flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-700"
                  >
                    <UserPlus size={14} /> Adicionar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Date range + Reports */}
      {selectedGroupId && (
        <>
          {/* Date Range Selector */}
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

          {loadingReports ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
            </div>
          ) : revenue ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  icon={TrendingUp}
                  label="Faturamento Total"
                  value={formatCurrency(revenue.grandTotal)}
                  color="text-green-600"
                  bg="bg-green-50"
                />
                <KpiCard
                  icon={BarChart3}
                  label="Total Pedidos"
                  value={String(revenue.totalOrders)}
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
                  icon={Building2}
                  label="Filiais"
                  value={String(revenue.branches.length)}
                  color="text-brand-600"
                  bg="bg-brand-50"
                />
              </div>

              {/* Per-Branch Revenue Breakdown */}
              {revenue.branches.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 size={16} className="text-brand-600" />
                    Faturamento por Filial
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 text-xs border-b">
                          <th className="pb-2">Loja</th>
                          <th className="pb-2 text-right">Pedidos</th>
                          <th className="pb-2 text-right">Faturamento</th>
                          <th className="pb-2 text-right">Ticket Médio</th>
                          <th className="pb-2 text-right">% do Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenue.branches.map((b) => {
                          const pct = revenue.grandTotal > 0 ? ((b.total / revenue.grandTotal) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={b.tenantId} className="border-b last:border-0">
                              <td className="py-2 font-medium">{b.name}</td>
                              <td className="py-2 text-right text-gray-500">{b.orderCount}</td>
                              <td className="py-2 text-right font-medium">{formatCurrency(b.total)}</td>
                              <td className="py-2 text-right text-gray-500">{formatCurrency(b.avgTicket)}</td>
                              <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-brand-500 h-full rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-gray-500 w-10 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Revenue Chart */}
              {revenue.daily.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-600" />
                    Faturamento Diário (Consolidado)
                  </h2>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {revenue.daily.map((d) => {
                      const maxRev = Math.max(...revenue.daily.map((x) => x.revenue), 1);
                      const pct = (d.revenue / maxRev) * 100;
                      return (
                        <div key={d.date} className="flex items-center gap-2 text-sm">
                          <span className="w-20 text-gray-500 text-xs shrink-0">
                            {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                              className="bg-green-500 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-24 text-right font-medium text-xs">
                            {formatCurrency(d.revenue)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row: Top Items + Payment Breakdown + Order Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Items */}
                {topItems.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="font-semibold mb-3">🏆 Top 10 Itens (Todas Filiais)</h2>
                    <div className="space-y-2">
                      {topItems.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="truncate max-w-[160px]">{item.name}</span>
                          </span>
                          <span className="text-gray-500 font-medium">{item.totalQuantity}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                            <span className="text-gray-700">
                              {PAYMENT_LABELS[p.method] || p.method}
                            </span>
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
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {STATUS_LABELS[s.status] || s.status}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">{s.count}</span>
                            <span className="font-medium w-16 text-right">
                              {formatCurrency(s.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Analytics */}
              {customerAnalytics && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Análise de Clientes (Cross-Branch)
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-700">
                        {customerAnalytics.totalCustomers}
                      </p>
                      <p className="text-xs text-blue-500">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-700">
                        {customerAnalytics.returningCustomers}
                      </p>
                      <p className="text-xs text-green-500">Recorrentes</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-purple-700">
                        {customerAnalytics.newCustomers}
                      </p>
                      <p className="text-xs text-purple-500">Novos</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-700">
                        {customerAnalytics.retentionRate}%
                      </p>
                      <p className="text-xs text-orange-500">Retenção</p>
                    </div>
                    <div className="bg-brand-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-brand-700">
                        {customerAnalytics.crossBranchCustomers}
                      </p>
                      <p className="text-xs text-brand-500">Multi-Filial</p>
                    </div>
                  </div>

                  {customerAnalytics.topCustomers.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-gray-400 mb-2">
                        Top Clientes por Receita (todas filiais)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 text-xs border-b">
                              <th className="pb-2">Cliente</th>
                              <th className="pb-2 text-right">Pedidos</th>
                              <th className="pb-2 text-right">Gasto</th>
                              <th className="pb-2 text-right">Filiais</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerAnalytics.topCustomers.map((c, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1.5">
                                  <span className="truncate max-w-[200px] block">
                                    {c.name || c.phone}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right text-gray-500">{c.orders}x</td>
                                <td className="py-1.5 text-right font-medium">
                                  {formatCurrency(c.spent)}
                                </td>
                                <td className="py-1.5 text-right">
                                  {c.branchCount > 1 ? (
                                    <span className="bg-brand-50 text-brand-700 text-xs px-1.5 py-0.5 rounded">
                                      {c.branchCount} filiais
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">1</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-50 border rounded-xl p-8 text-center">
              <AlertTriangle size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                Selecione um grupo para ver os relatórios consolidados.
              </p>
            </div>
          )}
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
