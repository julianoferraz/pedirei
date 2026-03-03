import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { Edit2, Save, X } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  maxOrders: number;
  maxProducts: number;
  aiEnabled: boolean;
  campaignsEnabled: boolean;
  nfceEnabled: boolean;
  multipleOperators: boolean;
  isActive: boolean;
}

export default function PlansPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});

  useEffect(() => {
    apiFetch<{ data: Plan[] }>('/api/master/plans', { token })
      .then((res) => setPlans(res.data || []))
      .catch(() => toast.error('Erro ao carregar planos'))
      .finally(() => setLoading(false));
  }, [token]);

  const startEdit = (plan: Plan) => {
    setEditing(plan.id);
    setEditForm({ ...plan });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await apiFetch(`/api/master/plans/${editing}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
        token,
      });
      toast.success('Plano atualizado');
      setEditing(null);
      const res = await apiFetch<{ data: Plan[] }>('/api/master/plans', { token });
      setPlans(res.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="text-center text-gray-500 py-8">Carregando...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Planos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            {editing === plan.id ? (
              <>
                <input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1 border rounded text-lg font-bold"
                />
                <input
                  type="number"
                  step="0.01"
                  value={editForm.price || 0}
                  onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1 border rounded"
                />
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Save size={16} /></button>
                  <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X size={16} /></button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <button onClick={() => startEdit(plan)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {plan.price === 0 ? 'Grátis' : `${formatCurrency(plan.price)}/mês`}
                </p>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>📦 {plan.maxOrders === 0 ? '∞' : plan.maxOrders} pedidos/mês</li>
                  <li>🍔 {plan.maxProducts === 0 ? '∞' : plan.maxProducts} produtos</li>
                  <li>{plan.aiEnabled ? '✅' : '❌'} IA / ChatGPT</li>
                  <li>{plan.campaignsEnabled ? '✅' : '❌'} Campanhas</li>
                  <li>{plan.nfceEnabled ? '✅' : '❌'} NFC-e</li>
                  <li>{plan.multipleOperators ? '✅' : '❌'} Múltiplos operadores</li>
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
