import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  Landmark,
  Plus,
  Minus,
  DollarSign,
  Lock,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  Receipt,
  X,
  Calendar,
} from 'lucide-react';

interface CashRegister {
  id: string;
  tenantId: string;
  openedBy: string;
  closedBy: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  movements?: CashMovement[];
  _count?: { movements: number };
}

interface CashMovement {
  id: string;
  type: 'SALE' | 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE';
  amount: number;
  description: string | null;
  orderId: string | null;
  operatorName: string;
  createdAt: string;
}

interface DailySummary {
  date: string;
  registersCount: number;
  totalSales: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalExpenses: number;
  netTotal: number;
  registers: CashRegister[];
}

const MOVE_TYPE_LABELS: Record<string, string> = {
  SALE: 'Venda',
  DEPOSIT: 'Suprimento',
  WITHDRAWAL: 'Sangria',
  EXPENSE: 'Despesa',
};

const MOVE_TYPE_COLORS: Record<string, string> = {
  SALE: 'bg-green-100 text-green-700',
  DEPOSIT: 'bg-blue-100 text-blue-700',
  WITHDRAWAL: 'bg-orange-100 text-orange-700',
  EXPENSE: 'bg-red-100 text-red-700',
};

const MOVE_TYPE_ICONS: Record<string, typeof ShoppingCart> = {
  SALE: ShoppingCart,
  DEPOSIT: ArrowDownCircle,
  WITHDRAWAL: ArrowUpCircle,
  EXPENSE: Receipt,
};

type Tab = 'current' | 'history' | 'report';

export default function CashRegisterPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>('current');
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<CashRegister | null>(null);

  // Forms
  const [openForm, setOpenForm] = useState({ openingBalance: '' });
  const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });
  const [movementForm, setMovementForm] = useState({
    type: 'DEPOSIT' as 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE',
    amount: '',
    description: '',
  });

  const operatorName = user?.name || 'Operador';

  const fetchCurrent = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: CashRegister | null }>('/api/cash-register/current', { token })
      .then((res) => setCurrentRegister(res.data))
      .catch(() => toast.error('Erro ao carregar caixa atual'))
      .finally(() => setLoading(false));
  };

  const fetchHistory = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: CashRegister[]; total: number }>(
      '/api/cash-register?limit=50',
      { token },
    )
      .then((res) => setRegisters(res.data))
      .catch(() => toast.error('Erro ao carregar histórico'))
      .finally(() => setLoading(false));
  };

  const fetchReport = (date?: string) => {
    setLoading(true);
    const d = date || reportDate;
    apiFetch<{ success: boolean; data: DailySummary }>(
      `/api/cash-register/report/daily?date=${d}`,
      { token },
    )
      .then((res) => setDailySummary(res.data))
      .catch(() => toast.error('Erro ao carregar relatório'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'current') fetchCurrent();
    else if (tab === 'history') fetchHistory();
    else if (tab === 'report') fetchReport();
  }, [token, tab]);

  // ── Handlers ───────────────────────────────────────────────

  const handleOpen = async () => {
    const balance = parseFloat(openForm.openingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Informe o valor de abertura');
      return;
    }
    try {
      await apiFetch('/api/cash-register/open', {
        token,
        method: 'POST',
        body: JSON.stringify({ openingBalance: balance, openedBy: operatorName }),
      });
      toast.success('Caixa aberto com sucesso!');
      setShowOpenModal(false);
      setOpenForm({ openingBalance: '' });
      fetchCurrent();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir caixa');
    }
  };

  const handleClose = async () => {
    if (!currentRegister) return;
    const balance = parseFloat(closeForm.closingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Informe o valor de fechamento');
      return;
    }
    try {
      await apiFetch(`/api/cash-register/${currentRegister.id}/close`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          closingBalance: balance,
          closedBy: operatorName,
          notes: closeForm.notes || undefined,
        }),
      });
      toast.success('Caixa fechado com sucesso!');
      setShowCloseModal(false);
      setCloseForm({ closingBalance: '', notes: '' });
      fetchCurrent();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fechar caixa');
    }
  };

  const handleAddMovement = async () => {
    if (!currentRegister) return;
    const amount = parseFloat(movementForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    try {
      await apiFetch(`/api/cash-register/${currentRegister.id}/movement`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          type: movementForm.type,
          amount,
          description: movementForm.description || undefined,
          operatorName,
        }),
      });
      toast.success('Movimentação registrada!');
      setShowMovementModal(false);
      setMovementForm({ type: 'DEPOSIT', amount: '', description: '' });
      fetchCurrent();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar movimentação');
    }
  };

  // ── Calculate running balance ─────────────────────────────
  const calcRunningBalance = (register: CashRegister) => {
    if (!register.movements) return Number(register.openingBalance);
    let balance = Number(register.openingBalance);
    for (const mov of register.movements) {
      const amount = Number(mov.amount);
      if (mov.type === 'SALE' || mov.type === 'DEPOSIT') {
        balance += amount;
      } else {
        balance -= amount;
      }
    }
    return balance;
  };

  const tabs: { key: Tab; label: string; icon: typeof Landmark }[] = [
    { key: 'current', label: 'Caixa Atual', icon: Landmark },
    { key: 'history', label: 'Histórico', icon: History },
    { key: 'report', label: 'Relatório Diário', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Landmark className="h-7 w-7 text-brand-500" />
          Gestão de Caixa
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
          {/* ── TAB: CAIXA ATUAL ─────────────────────── */}
          {tab === 'current' && (
            <div className="space-y-6">
              {!currentRegister ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Landmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nenhum caixa aberto no momento.</p>
                  <button
                    onClick={() => setShowOpenModal(true)}
                    className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-lg hover:bg-brand-600 transition-colors font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Abrir Caixa
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Valor de Abertura</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(Number(currentRegister.openingBalance))}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Saldo Atual</p>
                      <p className="text-2xl font-bold text-brand-600 mt-1">
                        {formatCurrency(calcRunningBalance(currentRegister))}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Movimentações</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {currentRegister.movements?.length || 0}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Aberto por</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{currentRegister.openedBy}</p>
                      <p className="text-xs text-gray-400">{formatDate(currentRegister.openedAt)}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowMovementModal(true)}
                      className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium"
                    >
                      <DollarSign className="h-4 w-4" />
                      Nova Movimentação
                    </button>
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      <Lock className="h-4 w-4" />
                      Fechar Caixa
                    </button>
                  </div>

                  {/* Movements list */}
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Movimentações</h3>
                    </div>
                    {!currentRegister.movements?.length ? (
                      <div className="p-6 text-center text-gray-400">Nenhuma movimentação registrada.</div>
                    ) : (
                      <div className="divide-y">
                        {currentRegister.movements.map((mov) => {
                          const Icon = MOVE_TYPE_ICONS[mov.type] || DollarSign;
                          return (
                            <div key={mov.id} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${MOVE_TYPE_COLORS[mov.type]}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {MOVE_TYPE_LABELS[mov.type]}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {mov.description || mov.operatorName} • {formatDate(mov.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <p
                                className={`text-sm font-semibold ${
                                  mov.type === 'SALE' || mov.type === 'DEPOSIT'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {mov.type === 'SALE' || mov.type === 'DEPOSIT' ? '+' : '-'}
                                {formatCurrency(Number(mov.amount))}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: HISTÓRICO ───────────────────────── */}
          {tab === 'history' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Histórico de Caixas</h3>
              </div>
              {!registers.length ? (
                <div className="p-6 text-center text-gray-400">Nenhum caixa registrado.</div>
              ) : (
                <div className="divide-y">
                  {registers.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => {
                        apiFetch<{ success: boolean; data: CashRegister }>(
                          `/api/cash-register/${reg.id}`,
                          { token },
                        )
                          .then((res) => setShowDetailModal(res.data))
                          .catch(() => toast.error('Erro ao carregar detalhes'));
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              reg.status === 'OPEN'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {reg.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(reg.openedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Aberto por {reg.openedBy}
                          {reg.closedBy && ` • Fechado por ${reg.closedBy}`}
                          {reg._count && ` • ${reg._count.movements} movs`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Abertura</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(reg.openingBalance))}
                        </p>
                        {reg.closingBalance != null && (
                          <>
                            <p className="text-xs text-gray-400 mt-1">Fechamento</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(Number(reg.closingBalance))}
                            </p>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: RELATÓRIO DIÁRIO ────────────────── */}
          {tab === 'report' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => fetchReport()}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 text-sm font-medium"
                >
                  Consultar
                </button>
              </div>

              {dailySummary && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase">Vendas</p>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatCurrency(dailySummary.totalSales)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase">Suprimentos</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">
                        {formatCurrency(dailySummary.totalDeposits)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase">Sangrias</p>
                      <p className="text-xl font-bold text-orange-600 mt-1">
                        {formatCurrency(dailySummary.totalWithdrawals)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase">Despesas</p>
                      <p className="text-xl font-bold text-red-600 mt-1">
                        {formatCurrency(dailySummary.totalExpenses)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 uppercase">Saldo Líquido</p>
                      <p
                        className={`text-xl font-bold mt-1 ${
                          dailySummary.netTotal >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(dailySummary.netTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      {dailySummary.registersCount} caixa(s) aberto(s) em {dailySummary.date}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL: ABRIR CAIXA ─────────────────────── */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Abrir Caixa</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Abertura (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openForm.openingBalance}
              onChange={(e) => setOpenForm({ openingBalance: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="0,00"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpen}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 text-sm font-medium"
              >
                Abrir Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FECHAR CAIXA ────────────────────── */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Fechar Caixa</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {currentRegister && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">
                  Saldo esperado:{' '}
                  <span className="font-bold text-gray-900">
                    {formatCurrency(calcRunningBalance(currentRegister))}
                  </span>
                </p>
              </div>
            )}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Contado no Caixa (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={closeForm.closingBalance}
              onChange={(e) => setCloseForm({ ...closeForm, closingBalance: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              placeholder="0,00"
              autoFocus
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea
              value={closeForm.notes}
              onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              rows={2}
              placeholder="Notas sobre o fechamento..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 text-sm font-medium"
              >
                Fechar Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVA MOVIMENTAÇÃO ───────────────── */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Nova Movimentação</h3>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={movementForm.type}
              onChange={(e) =>
                setMovementForm({
                  ...movementForm,
                  type: e.target.value as 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE',
                })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
            >
              <option value="DEPOSIT">Suprimento (entrada)</option>
              <option value="WITHDRAWAL">Sangria (retirada)</option>
              <option value="EXPENSE">Despesa</option>
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={movementForm.amount}
              onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              placeholder="0,00"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={movementForm.description}
              onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="Motivo da movimentação..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMovementModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMovement}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 text-sm font-medium"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALHE DO CAIXA ────────────────── */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Detalhes do Caixa</h3>
              <button
                onClick={() => setShowDetailModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Abertura</p>
                <p className="font-bold">{formatCurrency(Number(showDetailModal.openingBalance))}</p>
                <p className="text-xs text-gray-400">{formatDate(showDetailModal.openedAt)}</p>
                <p className="text-xs text-gray-500">{showDetailModal.openedBy}</p>
              </div>
              {showDetailModal.closingBalance != null && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Fechamento</p>
                  <p className="font-bold">{formatCurrency(Number(showDetailModal.closingBalance))}</p>
                  <p className="text-xs text-gray-400">
                    {showDetailModal.closedAt && formatDate(showDetailModal.closedAt)}
                  </p>
                  <p className="text-xs text-gray-500">{showDetailModal.closedBy}</p>
                </div>
              )}
            </div>

            {showDetailModal.expectedBalance != null &&
              showDetailModal.closingBalance != null && (
                <div
                  className={`rounded-lg p-3 mb-4 ${
                    Number(showDetailModal.closingBalance) === Number(showDetailModal.expectedBalance)
                      ? 'bg-green-50 text-green-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <p className="text-sm">
                    Esperado: {formatCurrency(Number(showDetailModal.expectedBalance))} | Contado:{' '}
                    {formatCurrency(Number(showDetailModal.closingBalance))} | Diferença:{' '}
                    <span className="font-bold">
                      {formatCurrency(
                        Number(showDetailModal.closingBalance) -
                          Number(showDetailModal.expectedBalance),
                      )}
                    </span>
                  </p>
                </div>
              )}

            {showDetailModal.movements && showDetailModal.movements.length > 0 && (
              <div className="divide-y border rounded-lg overflow-hidden">
                {showDetailModal.movements.map((mov) => {
                  const Icon = MOVE_TYPE_ICONS[mov.type] || DollarSign;
                  return (
                    <div key={mov.id} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${MOVE_TYPE_COLORS[mov.type]}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{MOVE_TYPE_LABELS[mov.type]}</p>
                          <p className="text-xs text-gray-400">
                            {mov.description || mov.operatorName}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                          mov.type === 'SALE' || mov.type === 'DEPOSIT'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {mov.type === 'SALE' || mov.type === 'DEPOSIT' ? '+' : '-'}
                        {formatCurrency(Number(mov.amount))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
