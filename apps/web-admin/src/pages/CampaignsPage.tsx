import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import {
  Send,
  Plus,
  Trash2,
  Eye,
  Play,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Megaphone,
} from 'lucide-react';

interface AudienceFilter {
  minOrders?: number;
  minSpent?: number;
  lastOrderDays?: number;
  lastContactDays?: number;
  minFeedback?: number;
  hasLoyalty?: boolean;
  isRegistered?: boolean;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  type: 'PROMOTIONAL' | 'REENGAGEMENT';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
  audienceFilter: AudienceFilter | null;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface CampaignStats {
  stats: { sent: number; failed: number; pending: number; total: number };
}

type View = 'list' | 'create' | 'stats';

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  SCHEDULED: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  SENDING: { label: 'Enviando...', color: 'bg-yellow-100 text-yellow-700' },
  SENT: { label: 'Enviada', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

export default function CampaignsPage() {
  const { token } = useAuth();
  const [view, setView] = useState<View>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'PROMOTIONAL' | 'REENGAGEMENT'>('PROMOTIONAL');
  const [scheduledAt, setScheduledAt] = useState('');
  const [filter, setFilter] = useState<AudienceFilter>({});
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch<{ data: Campaign[] }>('/api/campaigns', { token });
      setCampaigns(res.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, [token]);

  const fetchPreview = async (f: AudienceFilter) => {
    try {
      const res = await apiFetch<{ data: { count: number } }>('/api/campaigns/preview', {
        method: 'POST',
        token,
        body: JSON.stringify({ audienceFilter: Object.keys(f).length > 0 ? f : undefined }),
      });
      setPreviewCount(res.data.count);
    } catch { setPreviewCount(null); }
  };

  const handleFilterChange = (key: keyof AudienceFilter, value: any) => {
    const next = { ...filter };
    if (value === '' || value === false || value === undefined) {
      delete next[key];
    } else {
      (next as any)[key] = value;
    }
    setFilter(next);
    fetchPreview(next);
  };

  const handleCreate = async () => {
    if (!name || !message) return toast.error('Preencha nome e mensagem');
    setSending(true);
    try {
      const body: any = { name, message, type };
      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();
      if (Object.keys(filter).length > 0) body.audienceFilter = filter;

      await apiFetch('/api/campaigns', { method: 'POST', token, body: JSON.stringify(body) });
      toast.success('Campanha criada!');
      resetForm();
      setView('list');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Enviar esta campanha agora?')) return;
    try {
      await apiFetch(`/api/campaigns/${id}/send`, { method: 'POST', token });
      toast.success('Campanha em processamento!');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE', token });
      toast.success('Campanha excluída');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleViewStats = async (id: string) => {
    setSelectedId(id);
    setView('stats');
    try {
      const res = await apiFetch<{ data: Campaign & CampaignStats }>(`/api/campaigns/${id}/stats`, { token });
      setStats(res.data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setName(''); setMessage(''); setType('PROMOTIONAL');
    setScheduledAt(''); setFilter({}); setPreviewCount(null);
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone size={24} /> Campanhas
        </h1>
        {view === 'list' && (
          <button
            onClick={() => { resetForm(); setView('create'); fetchPreview({}); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition"
          >
            <Plus size={16} /> Nova Campanha
          </button>
        )}
        {view !== 'list' && (
          <button
            onClick={() => setView('list')}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
          >
            Voltar
          </button>
        )}
      </div>

      {/* CREATE VIEW */}
      {view === 'create' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5 max-w-2xl">
          <h2 className="font-semibold text-lg">Nova Campanha</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ex: Promoção de Natal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="PROMOTIONAL">Promocional</option>
              <option value="REENGAGEMENT">Reengajamento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem <span className="text-gray-400 text-xs ml-1">Use {'{nome}'} e {'{loja}'} como variáveis</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Olá {nome}! Temos novidades na {loja}..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agendar envio <span className="text-gray-400 text-xs ml-1">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Audience Filter */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Filter size={16} /> Filtro de Audiência
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Pedidos mínimos</label>
                <input
                  type="number"
                  min={0}
                  value={filter.minOrders ?? ''}
                  onChange={(e) => handleFilterChange('minOrders', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Ex: 1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Gasto mínimo (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={filter.minSpent ?? ''}
                  onChange={(e) => handleFilterChange('minSpent', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Ex: 50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Último pedido (até X dias)</label>
                <input
                  type="number"
                  min={1}
                  value={filter.lastOrderDays ?? ''}
                  onChange={(e) => handleFilterChange('lastOrderDays', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Ex: 30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Último contato (até X dias)</label>
                <input
                  type="number"
                  min={1}
                  value={filter.lastContactDays ?? ''}
                  onChange={(e) => handleFilterChange('lastContactDays', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Ex: 60"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Nota mínima (feedback)</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={filter.minFeedback ?? ''}
                  onChange={(e) => handleFilterChange('minFeedback', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Ex: 4"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filter.hasLoyalty || false}
                    onChange={(e) => handleFilterChange('hasLoyalty', e.target.checked || undefined)}
                    className="rounded"
                  />
                  Tem fidelidade
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Users size={16} className="text-brand-600" />
              <span className="text-sm font-medium">
                {previewCount !== null ? (
                  <>{previewCount} cliente{previewCount !== 1 ? 's' : ''} na audiência</>
                ) : (
                  'Calculando...'
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
            >
              <Plus size={16} /> {scheduledAt ? 'Agendar Campanha' : 'Criar Rascunho'}
            </button>
            <button
              onClick={() => setView('list')}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* STATS VIEW */}
      {view === 'stats' && stats && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-lg mb-4">Estatísticas da Campanha</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Users size={20} className="mx-auto text-gray-500 mb-1" />
                <p className="text-xl font-bold">{stats.stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle2 size={20} className="mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-green-700">{stats.stats.sent}</p>
                <p className="text-xs text-gray-500">Enviados</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <XCircle size={20} className="mx-auto text-red-500 mb-1" />
                <p className="text-xl font-bold text-red-700">{stats.stats.failed}</p>
                <p className="text-xs text-gray-500">Falharam</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <Clock size={20} className="mx-auto text-yellow-500 mb-1" />
                <p className="text-xl font-bold text-yellow-700">{stats.stats.pending}</p>
                <p className="text-xs text-gray-500">Pendentes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhuma campanha criada</p>
              <p className="text-sm text-gray-400 mt-1">Crie sua primeira campanha de WhatsApp em massa</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Campanha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Enviados</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Criada em</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-gray-400 text-xs truncate max-w-xs">{c.message}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.type === 'PROMOTIONAL' ? 'Promocional' : 'Reengajamento'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[c.status]?.color}`}>
                          {statusLabels[c.status]?.label}
                        </span>
                        {c.scheduledAt && c.status === 'SCHEDULED' && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {fmt(c.scheduledAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-600 font-medium">{c.sentCount}</span>
                        {c.failedCount > 0 && (
                          <span className="text-red-500 text-xs ml-1">({c.failedCount} falhas)</span>
                        )}
                        <span className="text-gray-400 text-xs"> / {c.targetCount}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(c.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(c.status === 'SENT' || c.status === 'SENDING') && (
                            <button
                              onClick={() => handleViewStats(c.id)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg"
                              title="Ver estatísticas"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                            <>
                              <button
                                onClick={() => handleSend(c.id)}
                                className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg"
                                title="Enviar agora"
                              >
                                <Play size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
