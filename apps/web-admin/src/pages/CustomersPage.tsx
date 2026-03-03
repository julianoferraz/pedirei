import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, formatPhone } from '../lib/utils';

interface Customer {
  id: string;
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  createdAt: string;
}

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<{ data: { data: Customer[] } }>(`/api/customers?search=${search}&limit=100`, { token })
      .then((res) => setCustomers(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, search]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Clientes</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone..."
        className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pedidos</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Gasto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Último Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">Carregando...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">Nenhum cliente encontrado.</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{c.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatPhone(c.phone)}</td>
                  <td className="px-4 py-3 text-sm text-center">{c.totalOrders}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">
                    {c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}
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
