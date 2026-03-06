import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import { Activity, Facebook, BarChart3, Megaphone, Music2 } from 'lucide-react';

interface PixelSettings {
  facebookPixelId: string | null;
  googleAnalyticsId: string | null;
  googleAdsId: string | null;
  tiktokPixelId: string | null;
}

const PIXELS = [
  {
    key: 'facebookPixelId' as const,
    label: 'Facebook Pixel',
    placeholder: 'Ex: 123456789012345',
    hint: 'ID do Pixel encontrado no Gerenciador de Eventos do Meta Business Suite',
    icon: Facebook,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    key: 'googleAnalyticsId' as const,
    label: 'Google Analytics (GA4)',
    placeholder: 'Ex: G-XXXXXXXXXX',
    hint: 'ID de medição do GA4 encontrado em Admin → Fluxos de dados',
    icon: BarChart3,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    key: 'googleAdsId' as const,
    label: 'Google Ads',
    placeholder: 'Ex: AW-123456789',
    hint: 'ID de conversão do Google Ads encontrado em Ferramentas → Conversões',
    icon: Megaphone,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    key: 'tiktokPixelId' as const,
    label: 'TikTok Pixel',
    placeholder: 'Ex: CXXXXXXXXXXXXXXXXX',
    hint: 'ID do Pixel encontrado no TikTok Ads Manager → Ativos → Eventos',
    icon: Music2,
    color: 'text-gray-900',
    bg: 'bg-gray-100',
  },
];

export default function PixelsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<PixelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ success: boolean; data: PixelSettings }>('/api/pixels/settings', { token })
      .then((r) => setSettings(r.data))
      .catch(() => toast.error('Erro ao carregar configurações de pixels'))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = {
        facebookPixelId: settings.facebookPixelId?.trim() || null,
        googleAnalyticsId: settings.googleAnalyticsId?.trim() || null,
        googleAdsId: settings.googleAdsId?.trim() || null,
        tiktokPixelId: settings.tiktokPixelId?.trim() || null,
      };
      await apiFetch('/api/pixels/settings', {
        token,
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      toast.success('Pixels salvos com sucesso');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-500">
        Não foi possível carregar as configurações de pixels.
      </div>
    );
  }

  const activeCount = [
    settings.facebookPixelId,
    settings.googleAnalyticsId,
    settings.googleAdsId,
    settings.tiktokPixelId,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="text-brand-600" size={28} />
          Pixels de Marketing
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure seus pixels de rastreamento para medir conversões no cardápio digital
        </p>
      </div>

      {/* Status bar */}
      <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Pixels ativos</p>
          <p className="text-2xl font-bold text-gray-900">{activeCount} / 4</p>
        </div>
        <div className="flex gap-2">
          {PIXELS.map(({ key, icon: Icon, color, bg }) => (
            <div
              key={key}
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                settings[key] ? bg : 'bg-gray-50'
              }`}
            >
              <Icon
                size={18}
                className={settings[key] ? color : 'text-gray-300'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pixel fields */}
      <div className="space-y-4">
        {PIXELS.map(({ key, label, placeholder, hint, icon: Icon, color, bg }) => (
          <div key={key} className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 ${bg} rounded-lg flex items-center justify-center shrink-0`}
              >
                <Icon size={22} className={color} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
                <p className="text-xs text-gray-400 mb-3">{hint}</p>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={settings[key] || ''}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Como funciona?</strong> Os pixels serão carregados automaticamente no seu cardápio
        digital (<code>pedirei.online/seu-slug</code>). Quando um cliente fizer um pedido, o evento
        de conversão (Purchase) será disparado automaticamente em todas as plataformas configuradas.
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Salvar pixels'}
      </button>
    </div>
  );
}
