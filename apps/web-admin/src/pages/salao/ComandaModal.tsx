import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { toast } from 'sonner';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Split,
  CreditCard,
} from 'lucide-react';
import type { SessionDetail, SessionItemView } from '@pedirei/shared';
import DividirContaModal from './DividirContaModal';
import FecharContaModal from './FecharContaModal';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  stockMode: string;
  stockQty: number | null;
  isAvailable: boolean;
}

interface Props {
  sessionId: string;
  onClose: () => void;
}

export default function ComandaModal({ sessionId, onClose }: Props) {
  const { token } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Custom item
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Sub-modals
  const [showDividir, setShowDividir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: SessionDetail }>(`/api/salao/sessions/${sessionId}`, { token });
      setSession(res.data);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [sessionId, token]);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: any }>('/api/menu/public', { token });
      const items: MenuItem[] = [];
      for (const cat of res.data.categories || []) {
        for (const item of cat.items || []) {
          items.push({
            id: item.id,
            name: item.name,
            price: item.price,
            stockMode: item.stockMode || 'NONE',
            stockQty: item.stockQty ?? null,
            isAvailable: item.isAvailable !== false,
          });
        }
      }
      setMenuItems(items);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    Promise.all([fetchSession(), fetchMenu()]).finally(() => setLoading(false));
  }, [fetchSession, fetchMenu]);

  // ── Add menu item ────────────────────────────────────────
  const addMenuItem = async (menuItem: MenuItem) => {
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ menuItemId: menuItem.id, quantity: 1 }),
        token,
      });
      fetchSession();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Add custom item ──────────────────────────────────────
  const addCustomItem = async () => {
    if (!customName.trim()) return toast.error('Nome é obrigatório');
    const price = Math.round(parseFloat(customPrice) * 100);
    if (!price || price <= 0) return toast.error('Preço inválido');
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ customName: customName.trim(), customPrice: price, quantity: 1 }),
        token,
      });
      setCustomName('');
      setCustomPrice('');
      fetchSession();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Update item qty ──────────────────────────────────────
  const updateQty = async (item: SessionItemView, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      return removeItem(item.id);
    }
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty }),
        token,
      });
      fetchSession();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/items/${itemId}`, {
        method: 'DELETE',
        token,
      });
      fetchSession();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Print ────────────────────────────────────────────────
  const handlePrint = async () => {
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/print`, {
        method: 'POST',
        body: JSON.stringify({}),
        token,
      });
      toast.success('Imprimindo conta...');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Filter menu items ────────────────────────────────────
  const filteredItems = menuItems.filter(
    (m) => m.isAvailable && m.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading || !session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalFormatted = (session.totalAmount / 100).toFixed(2);

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">
              Comanda {session.table ? `· Mesa #${session.table.number}` : ''}
            </h2>
            {session.guestName && (
              <span className="text-sm text-gray-500">{session.guestName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button
              onClick={() => setShowDividir(true)}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100"
            >
              <Split className="h-4 w-4" /> Dividir
            </button>
            <button
              onClick={() => setShowFechar(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600"
            >
              <CreditCard className="h-4 w-4" /> Fechar conta
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Add items */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar no cardápio..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
              {/* Custom item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Item manual"
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="R$"
                  className="w-20 border rounded-lg px-3 py-1.5 text-sm"
                />
                <button
                  onClick={addCustomItem}
                  className="px-3 py-1.5 bg-gray-100 border rounded-lg text-sm hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredItems.map((m) => {
                const outOfStock = m.stockMode === 'BY_QUANTITY' && m.stockQty !== null && m.stockQty <= 0;
                return (
                  <button
                    key={m.id}
                    onClick={() => !outOfStock && addMenuItem(m)}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition ${
                      outOfStock
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-brand-50 hover:text-brand-600'
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="flex items-center gap-2 text-xs whitespace-nowrap">
                      {m.stockMode === 'BY_QUANTITY' && m.stockQty !== null && (
                        <span className={`${m.stockQty <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                          est: {m.stockQty}
                        </span>
                      )}
                      <span className="font-medium">R$ {(m.price / 100).toFixed(2)}</span>
                      <Plus className="h-3.5 w-3.5 text-brand-500" />
                    </span>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">Nenhum item encontrado</div>
              )}
            </div>
          </div>

          {/* Right: Session items */}
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {session.items.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">Nenhum item adicionado</div>
              ) : (
                session.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => updateQty(item, -1)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item, 1)}
                        className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm w-20 text-right">
                        R$ {((item.unitPrice * item.quantity) / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total bar */}
            <div className="border-t px-4 py-3 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-500">{session.items.length} itens</span>
              <span className="text-xl font-bold text-brand-600">R$ {totalFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showDividir && (
        <DividirContaModal
          sessionId={sessionId}
          total={session.totalAmount}
          onClose={() => setShowDividir(false)}
        />
      )}

      {showFechar && (
        <FecharContaModal
          sessionId={sessionId}
          total={session.totalAmount}
          onClose={() => setShowFechar(false)}
          onClosed={() => {
            setShowFechar(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
