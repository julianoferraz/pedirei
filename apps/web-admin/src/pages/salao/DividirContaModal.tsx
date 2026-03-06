import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { toast } from 'sonner';
import { X, Printer, Minus, Plus } from 'lucide-react';

interface Props {
  sessionId: string;
  total: number;
  onClose: () => void;
}

export default function DividirContaModal({ sessionId, total, onClose }: Props) {
  const { token } = useAuth();
  const [parts, setParts] = useState(2);
  const [splitData, setSplitData] = useState<{ parts: number; perPart: number; total: number } | null>(null);

  useEffect(() => {
    const fetchSplit = async () => {
      try {
        const res = await apiFetch<{ data: { parts: number; perPart: number; total: number } }>(
          `/api/salao/sessions/${sessionId}/split?parts=${parts}`,
          { token },
        );
        setSplitData(res.data);
      } catch {
        // silent
      }
    };
    fetchSplit();
  }, [sessionId, parts, token]);

  const handlePrintPart = async (partIndex: number) => {
    try {
      await apiFetch(`/api/salao/sessions/${sessionId}/print`, {
        method: 'POST',
        body: JSON.stringify({ splitPart: partIndex, splitTotal: parts }),
        token,
      });
      toast.success(`Imprimindo parte ${partIndex} de ${parts}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Dividir Conta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          Total: <strong className="text-brand-600">R$ {(total / 100).toFixed(2)}</strong>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setParts((p) => Math.max(2, p - 1))}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-3xl font-bold">{parts}</span>
          <button
            onClick={() => setParts((p) => Math.min(20, p + 1))}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">pessoas</div>

        {splitData && (
          <div className="bg-brand-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-brand-600">
              R$ {(splitData.perPart / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">por pessoa</div>
          </div>
        )}

        {/* Print individual receipts */}
        <div className="space-y-2">
          {Array.from({ length: parts }, (_, i) => (
            <button
              key={i}
              onClick={() => handlePrintPart(i + 1)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir parte {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
