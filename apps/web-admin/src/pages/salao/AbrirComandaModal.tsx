import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { toast } from 'sonner';
import { X, Users } from 'lucide-react';
import type { TableWithStatus } from '@pedirei/shared';

interface Props {
  table: TableWithStatus;
  onClose: () => void;
  onOpen: (sessionId: string) => void;
}

export default function AbrirComandaModal({ table, onClose, onOpen }: Props) {
  const { token } = useAuth();
  const [guestName, setGuestName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<{ data: { id: string } }>('/api/salao/sessions', {
        method: 'POST',
        body: JSON.stringify({ tableId: table.id, guestName: guestName.trim() || undefined }),
        token,
      });
      toast.success(`Comanda aberta na mesa #${table.number}`);
      onOpen(res.data.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Abrir Comanda</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <Users className="h-4 w-4" />
          <span>
            Mesa <strong>#{table.number}</strong>
            {table.label && <span className="text-gray-400"> · {table.label}</span>}
            <span className="text-gray-400"> · {table.capacity} lugares</span>
          </span>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Nome do cliente (opcional)</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Ex: João"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpen}
            disabled={saving}
            className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Abrindo...' : 'Abrir comanda'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
