import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { toast } from 'sonner';
import { X, CreditCard, Banknote, QrCode, Wallet } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'Pix', icon: QrCode },
  { value: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard },
  { value: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
  { value: 'CASH', label: 'Dinheiro', icon: Banknote },
  { value: 'OTHER', label: 'Outro', icon: Wallet },
];

interface Props {
  sessionId: string;
  total: number;
  onClose: () => void;
  onClosed: () => void;
}

export default function FecharContaModal({ sessionId, total, onClose, onClosed }: Props) {
  const { token } = useAuth();
  const [method, setMethod] = useState('PIX');
  const [saving, setSaving] = useState(false);

  const handleClose = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: method }),
        token,
      });
      toast.success('Conta fechada!');
      onClosed();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Fechar Conta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-brand-50 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-500">Total a pagar</div>
          <div className="text-3xl font-bold text-brand-600">
            R$ {(total / 100).toFixed(2)}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Forma de pagamento</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              const selected = method === pm.value;
              return (
                <button
                  key={pm.value}
                  onClick={() => setMethod(pm.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 bg-brand-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Fechando...' : 'Confirmar fechamento'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
