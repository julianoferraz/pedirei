import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Store,
  Link,
  Unlink,
  RefreshCw,
  Upload,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Integration {
  id: string;
  provider: 'IFOOD' | 'RAPPI';
  merchantId: string | null;
  status: string;
  catalogSyncedAt: string | null;
  lastWebhookAt: string | null;
  isActive: boolean;
}

interface Stats {
  ifoodToday: number;
  rappiToday: number;
  ifoodTotal: number;
  rappiTotal: number;
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: any }> = {
  CONNECTED: { label: 'Conectado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  DISCONNECTED: { label: 'Desconectado', color: 'bg-gray-100 text-gray-500', icon: XCircle },
  PENDING: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ERROR: { label: 'Erro', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const MARKETPLACE_INFO: Record<string, { name: string; color: string; logo: string }> = {
  IFOOD: { name: 'iFood', color: 'border-red-500', logo: '🔴' },
  RAPPI: { name: 'Rappi', color: 'border-orange-500', logo: '🟠' },
};

type ConnectForm = {
  provider: 'IFOOD' | 'RAPPI' | null;
  clientId: string;
  clientSecret: string;
  merchantId: string;
  apiKey: string;
  storeId: string;
  apiSecret: string;
};

const emptyForm: ConnectForm = {
  provider: null,
  clientId: '',
  clientSecret: '',
  merchantId: '',
  apiKey: '',
  storeId: '',
  apiSecret: '',
};

export default function MarketplacePage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ConnectForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [intRes, statsRes] = await Promise.all([
        apiFetch<{ data: Integration[] }>('/api/marketplace/integrations'),
        apiFetch<{ data: Stats }>('/api/marketplace/stats'),
      ]);
      setIntegrations(intRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.provider) return;
    setSubmitting(true);

    const credentials: Record<string, string> =
      form.provider === 'IFOOD'
        ? { clientId: form.clientId, clientSecret: form.clientSecret, merchantId: form.merchantId }
        : { apiKey: form.apiKey, storeId: form.storeId, apiSecret: form.apiSecret };

    try {
      await apiFetch('/api/marketplace/connect', {
        method: 'POST',
        body: JSON.stringify({ provider: form.provider, credentials }),
      });
      toast.success(`${MARKETPLACE_INFO[form.provider].name} conectado!`);
      setForm(emptyForm);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Desconectar ${MARKETPLACE_INFO[provider]?.name}? Pedidos do marketplace deixarão de entrar.`)) return;
    setDisconnecting(provider);
    try {
      await apiFetch('/api/marketplace/disconnect', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      toast.success('Marketplace desconectado');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSyncCatalog = async (provider: string) => {
    setSyncing(provider);
    try {
      const res = await apiFetch<{ data: { syncedItems: number } }>('/api/marketplace/sync-catalog', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      toast.success(`Cardápio sincronizado: ${res.data.syncedItems} itens`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const connectedProviders = integrations.filter((i) => i.status === 'CONNECTED').map((i) => i.provider);
  const availableProviders = (['IFOOD', 'RAPPI'] as const).filter((p) => !connectedProviders.includes(p));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Store size={24} /> Integrações Marketplace
      </h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">iFood Hoje</p>
            <p className="text-2xl font-bold">{stats.ifoodToday}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Rappi Hoje</p>
            <p className="text-2xl font-bold">{stats.rappiToday}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">iFood Total</p>
            <p className="text-2xl font-bold">{stats.ifoodTotal}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Rappi Total</p>
            <p className="text-2xl font-bold">{stats.rappiTotal}</p>
          </div>
        </div>
      )}

      {/* Connected integrations */}
      {integrations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Marketplaces</h2>
          {integrations.map((integration) => {
            const info = MARKETPLACE_INFO[integration.provider];
            const badge = STATUS_BADGES[integration.status] || STATUS_BADGES.DISCONNECTED;
            const BadgeIcon = badge.icon;

            return (
              <div key={integration.id} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${info.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.logo}</span>
                    <div>
                      <h3 className="font-bold text-lg">{info.name}</h3>
                      {integration.merchantId && (
                        <p className="text-xs text-gray-400">ID: {integration.merchantId}</p>
                      )}
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    <BadgeIcon size={12} /> {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-500 mb-4">
                  <div>
                    <span className="text-xs text-gray-400">Último sync</span>
                    <p>{formatDate(integration.catalogSyncedAt)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Último pedido</span>
                    <p>{formatDate(integration.lastWebhookAt)}</p>
                  </div>
                </div>

                {integration.status === 'CONNECTED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSyncCatalog(integration.provider)}
                      disabled={syncing === integration.provider}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm transition"
                    >
                      <Upload size={14} />
                      {syncing === integration.provider ? 'Sincronizando...' : 'Enviar Cardápio'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.provider)}
                      disabled={disconnecting === integration.provider}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm transition"
                    >
                      <Unlink size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Connect new marketplace */}
      {availableProviders.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Link size={18} /> Conectar Marketplace
          </h2>

          {/* Provider selector */}
          {!form.provider ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableProviders.map((p) => {
                const info = MARKETPLACE_INFO[p];
                return (
                  <button
                    key={p}
                    onClick={() => setForm({ ...emptyForm, provider: p })}
                    className={`p-4 border-2 rounded-xl hover:border-brand-500 transition text-left`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{info.logo}</span>
                      <div>
                        <p className="font-bold text-lg">{info.name}</p>
                        <p className="text-xs text-gray-500">Clique para configurar</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{MARKETPLACE_INFO[form.provider].logo}</span>
                <span className="font-semibold">{MARKETPLACE_INFO[form.provider].name}</span>
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                >
                  Trocar
                </button>
              </div>

              {form.provider === 'IFOOD' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Client ID</label>
                    <input
                      type="text"
                      value={form.clientId}
                      onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Seu Client ID do iFood"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={form.clientSecret}
                      onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Seu Client Secret"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Merchant ID</label>
                    <input
                      type="text"
                      value={form.merchantId}
                      onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="ID da sua loja no iFood"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">API Key</label>
                    <input
                      type="text"
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Sua API Key Rappi"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Store ID</label>
                    <input
                      type="text"
                      value={form.storeId}
                      onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="ID da sua loja na Rappi"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">API Secret (opcional)</label>
                    <input
                      type="password"
                      value={form.apiSecret}
                      onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Para validação de webhooks"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white rounded-lg transition text-sm"
                >
                  <Link size={14} /> {submitting ? 'Conectando...' : 'Conectar'}
                </button>
                <p className="text-xs text-gray-400">
                  A conexão será testada automaticamente antes de salvar
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Webhook URL info */}
      <div className="bg-gray-50 rounded-xl p-5 border border-dashed">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <BarChart3 size={16} /> URLs de Webhook
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Configure estas URLs no painel do marketplace para receber pedidos automaticamente:
        </p>
        <div className="space-y-2">
          {integrations.filter((i) => i.status === 'CONNECTED').map((i) => (
            <div key={i.id} className="flex items-center gap-2">
              <span className="text-sm">{MARKETPLACE_INFO[i.provider].logo}</span>
              <code className="text-xs bg-white px-3 py-1.5 rounded border flex-1 select-all">
                {window.location.origin}/api/webhook/marketplace/{i.provider.toLowerCase()}/{i.merchantId}
              </code>
            </div>
          ))}
          {integrations.filter((i) => i.status === 'CONNECTED').length === 0 && (
            <p className="text-xs text-gray-400">Conecte um marketplace para ver a URL</p>
          )}
        </div>
      </div>
    </div>
  );
}
