import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export default function MenuPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewItem, setShowNewItem] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '' });

  const fetchMenu = async () => {
    try {
      const res = await apiFetch<{ data: Category[] }>('/api/menu/categories', { token });
      setCategories(res.data || []);
    } catch {
      toast.error('Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, [token]);

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await apiFetch('/api/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName }),
        token,
      });
      setNewCatName('');
      setShowNewCategory(false);
      toast.success('Categoria criada');
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const createItem = async (categoryId: string) => {
    if (!newItem.name.trim() || !newItem.price) return;
    try {
      await apiFetch('/api/menu/items', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          name: newItem.name,
          description: newItem.description,
          price: parseFloat(newItem.price),
        }),
        token,
      });
      setNewItem({ name: '', description: '', price: '' });
      setShowNewItem(null);
      toast.success('Item criado');
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleItem = async (itemId: string, isActive: boolean) => {
    try {
      await apiFetch(`/api/menu/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !isActive }),
        token,
      });
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Excluir este item?')) return;
    try {
      await apiFetch(`/api/menu/items/${itemId}`, { method: 'DELETE', token });
      toast.success('Item excluído');
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="text-center text-gray-500 py-8">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cardápio</h1>
        <button
          onClick={() => setShowNewCategory(true)}
          className="flex items-center gap-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition"
        >
          <Plus size={16} /> Categoria
        </button>
      </div>

      {showNewCategory && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && createCategory()}
          />
          <button onClick={createCategory} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">
            Criar
          </button>
          <button onClick={() => setShowNewCategory(false)} className="px-4 py-2 text-gray-500 text-sm">
            Cancelar
          </button>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">{cat.name}</h2>
            <button
              onClick={() => setShowNewItem(showNewItem === cat.id ? null : cat.id)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
            >
              <Plus size={14} /> Adicionar item
            </button>
          </div>

          {showNewItem === cat.id && (
            <div className="p-4 bg-gray-50 border-b space-y-2">
              <input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Nome do item"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Descrição (opcional)"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="Preço"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <button
                  onClick={() => createItem(cat.id)}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          <div className="divide-y">
            {cat.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!item.isActive ? 'text-gray-400 line-through' : ''}`}>
                      {item.name}
                    </span>
                    {!item.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inativo</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  )}
                </div>
                <span className="font-bold text-brand-600 text-sm whitespace-nowrap">
                  {formatCurrency(item.price)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleItem(item.id, item.isActive)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title={item.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {item.isActive ? (
                      <ToggleRight size={18} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={18} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {cat.items.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">Nenhum item nesta categoria</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
