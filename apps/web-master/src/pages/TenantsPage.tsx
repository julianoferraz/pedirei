import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
  whatsappConnected: boolean;
  plan: { name: string };
  createdAt: string;
  _count?: { orders: number };
}

export default function TenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTenants = async () => {
    try {
      const res = await apiFetch<{ data: { data: Tenant[] } }>(
        `/api/master/tenants?search=${search}&limit=100`,
        { token },
      );
      setTenants(res.data.data || []);
    } catch {
      toast.error('Erro ao carregar restaurantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, [token, search]);

  const toggleTenant = async (id: string, isActive: boolean) => {
    try {
      await apiFetch(`/api/master/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !isActive }),
        token,
      });
      toast.success(isActive ? 'Restaurante desativado' : 'Restaurante ativado');
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Restaurantes</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar restaurante..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurante</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Criado em</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum restaurante encontrado.</td></tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{t.plan?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex w-2.5 h-2.5 rounded-full ${t.whatsappConnected ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleTenant(t.id, t.isActive)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                      title={t.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {t.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
