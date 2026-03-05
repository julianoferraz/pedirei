import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  Package,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  History,
  ArrowUpDown,
  Search,
  X,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  imageUrl: string | null;
  isPaused: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
}

interface InventoryMovement {
  id: string;
  tenantId: string;
  menuItemId: string;
  type: 'IN' | 'OUT' | 'SALE' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  reason: string | null;
  orderId: string | null;
  createdAt: string;
  menuItem: { id: string; name: string; imageUrl: string | null };
}

interface LowStockAlert {
  count: number;
  items: Array<{ id: string; name: string; stockQuantity: number; lowStockThreshold: number }>;
}

const MOVE_TYPE_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
  SALE: 'Venda',
  ADJUSTMENT: 'Ajuste',
  RETURN: 'Devolução',
};

const MOVE_TYPE_COLORS: Record<string, string> = {
  IN: 'bg-green-100 text-green-700',
  OUT: 'bg-red-100 text-red-700',
  SALE: 'bg-blue-100 text-blue-700',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
  RETURN: 'bg-purple-100 text-purple-700',
};

type Tab = 'inventory' | 'movements' | 'alerts';

export default function InventoryPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    menuItemId: '',
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN',
    quantity: 1,
    reason: '',
  });

  const fetchInventory = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: { data: InventoryItem[]; total: number } }>(
      '/api/inventory?limit=100',
      { token },
    )
      .then((res) => setItems(res.data.data))
      .catch(() => toast.error('Erro ao carregar estoque'))
      .finally(() => setLoading(false));
  };

  const fetchMovements = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: { data: InventoryMovement[]; total: number } }>(
      '/api/inventory/movements?limit=50',
      { token },
    )
      .then((res) => setMovements(res.data.data))
      .catch(() => toast.error('Erro ao carregar movimentações'))
      .finally(() => setLoading(false));
  };

  const fetchAlerts = () => {
    setLoading(true);
    apiFetch<{ success: boolean; data: LowStockAlert }>('/api/inventory/alerts', { token })
      .then((res) => setAlerts(res.data))
      .catch(() => toast.error('Erro ao carregar alertas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'inventory') fetchInventory();
    else if (tab === 'movements') fetchMovements();
    else if (tab === 'alerts') fetchAlerts();
  }, [token, tab]);

  const handleAdjust = async () => {
    if (!adjustForm.menuItemId || adjustForm.quantity < 1) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await apiFetch('/api/inventory/adjust', {
        token,
        method: 'POST',
        body: JSON.stringify(adjustForm),
      });
      toast.success('Estoque ajustado com sucesso');
      setShowAdjustModal(false);
      setAdjustForm({ menuItemId: '', type: 'IN', quantity: 1, reason: '' });
      fetchInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ajustar estoque');
    }
  };

  const openAdjust = (itemId: string, type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN') => {
    setAdjustForm({ menuItemId: itemId, type, quantity: 1, reason: '' });
    setShowAdjustModal(true);
  };

  const filteredItems = items.filter(
    (item) => item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controle de Estoque</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: 'inventory' as Tab, label: 'Estoque', icon: Package },
          { key: 'movements' as Tab, label: 'Movimentações', icon: History },
          { key: 'alerts' as Tab, label: 'Alertas', icon: AlertTriangle },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === key
                ? 'bg-white shadow-sm text-brand-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
            {key === 'alerts' && alerts && alerts.count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alerts.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estoque</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mín.</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {search
                        ? 'Nenhum item encontrado'
                        : 'Nenhum item com controle de estoque ativo. Ative nas configurações do item no Cardápio.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.stockQuantity <= item.lowStockThreshold;
                    const isOut = item.stockQuantity === 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package size={16} className="text-gray-400" />
                              </div>
                            )}
                            <span className="font-medium text-sm">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.categoryName}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(Number(item.price))}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-sm font-bold ${
                              isOut
                                ? 'text-red-600'
                                : isLow
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                            }`}
                          >
                            {item.stockQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-400">
                          {item.lowStockThreshold}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Esgotado
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              <AlertTriangle size={12} /> Baixo
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openAdjust(item.id, 'IN')}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"
                              title="Entrada"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={() => openAdjust(item.id, 'OUT')}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                              title="Saída"
                            >
                              <Minus size={16} />
                            </button>
                            <button
                              onClick={() => openAdjust(item.id, 'ADJUSTMENT')}
                              className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600"
                              title="Ajuste"
                            >
                              <ArrowUpDown size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Movements Tab */}
      {tab === 'movements' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qtd.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma movimentação registrada
                  </td>
                </tr>
              ) : (
                movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(mov.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{mov.menuItem.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          MOVE_TYPE_COLORS[mov.type]
                        }`}
                      >
                        {MOVE_TYPE_LABELS[mov.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      {mov.type === 'OUT' || mov.type === 'SALE' ? '-' : '+'}
                      {mov.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{mov.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
              Carregando...
            </div>
          ) : !alerts || alerts.count === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <Package size={48} className="mx-auto text-green-400 mb-3" />
              <p className="text-gray-500">Nenhum item com estoque baixo. Tudo certo!</p>
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="text-yellow-600 shrink-0" size={24} />
                <div>
                  <p className="font-medium text-yellow-800">
                    {alerts.count} {alerts.count === 1 ? 'item precisa' : 'itens precisam'} de reposição
                  </p>
                  <p className="text-sm text-yellow-600">
                    Estes itens estão com estoque abaixo do limite mínimo configurado.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estoque Atual</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Limite Mín.</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alerts.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${item.stockQuantity === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                            {item.stockQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-400">
                          {item.lowStockThreshold}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              openAdjust(item.id, 'IN');
                              setTab('inventory');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition"
                          >
                            <Plus size={14} /> Repor
                          </button>
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

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">
                {adjustForm.type === 'IN' && 'Entrada de Estoque'}
                {adjustForm.type === 'OUT' && 'Saída de Estoque'}
                {adjustForm.type === 'ADJUSTMENT' && 'Ajuste de Estoque'}
                {adjustForm.type === 'RETURN' && 'Devolução'}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="Ex: Reposição semanal, Produto avariado..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdjust}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
