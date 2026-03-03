import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import { Wifi, WifiOff, QrCode, RefreshCw } from 'lucide-react';

interface WaStatus {
  status: 'connecting' | 'open' | 'close' | 'qr';
  qrCode?: string;
  phone?: string;
  name?: string;
}

export default function WhatsAppPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<WaStatus>({ status: 'close' });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch<{ data: WaStatus }>('/api/tenant/whatsapp/status', { token });
      setStatus(res.data);
    } catch {
      setStatus({ status: 'close' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const connect = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/tenant/whatsapp/connect', { method: 'POST', token });
      toast.success('Conectando...');
      setTimeout(fetchStatus, 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await apiFetch('/api/tenant/whatsapp/disconnect', { method: 'POST', token });
      toast.success('Desconectado');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          {status.status === 'open' ? (
            <Wifi className="text-green-500" size={24} />
          ) : (
            <WifiOff className="text-gray-400" size={24} />
          )}
          <div>
            <p className="font-semibold">
              {status.status === 'open' ? 'Conectado' : status.status === 'qr' ? 'Aguardando QR Code' : status.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </p>
            {status.phone && <p className="text-sm text-gray-500">{status.phone}</p>}
          </div>
        </div>

        {status.status === 'qr' && status.qrCode && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-3">Escaneie o QR Code com o WhatsApp:</p>
            <img src={status.qrCode} alt="QR Code" className="mx-auto w-64 h-64 rounded-xl" />
          </div>
        )}

        <div className="flex gap-3">
          {status.status !== 'open' ? (
            <button
              onClick={connect}
              disabled={loading}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
            >
              {loading ? 'Conectando...' : 'Conectar'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
            >
              Desconectar
            </button>
          )}
          <button onClick={fetchStatus} className="p-2.5 hover:bg-gray-100 rounded-lg" title="Atualizar">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <h2 className="font-semibold mb-3">Como funciona</h2>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Clique em "Conectar" para gerar o QR Code</li>
          <li>Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo</li>
          <li>Escaneie o QR Code exibido acima</li>
          <li>Pronto! O chatbot começará a atender seus clientes automaticamente</li>
        </ol>
      </div>
    </div>
  );
}
