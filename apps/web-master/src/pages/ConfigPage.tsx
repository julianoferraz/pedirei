import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface Config {
  platformName: string;
  platformUrl: string;
  platformEmail: string;
  defaultAiModel: string;
  maxTrialDays: number;
}

export default function ConfigPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Config }>('/api/master/config', { token })
      .then((res) => setConfig(res.data))
      .catch(() => toast.error('Erro ao carregar configurações'));
  }, [token]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await apiFetch('/api/master/config', { method: 'PUT', body: JSON.stringify(config), token });
      toast.success('Configurações salvas!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <div className="text-center text-gray-500 py-8">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações da Plataforma</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
        >
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <Field label="Nome da Plataforma" value={config.platformName} onChange={(v) => setConfig({ ...config, platformName: v })} />
        <Field label="URL" value={config.platformUrl} onChange={(v) => setConfig({ ...config, platformUrl: v })} />
        <Field label="Email" value={config.platformEmail} onChange={(v) => setConfig({ ...config, platformEmail: v })} />
        <Field label="Modelo AI Padrão" value={config.defaultAiModel} onChange={(v) => setConfig({ ...config, defaultAiModel: v })} />
        <Field label="Dias de Trial" value={String(config.maxTrialDays)} onChange={(v) => setConfig({ ...config, maxTrialDays: parseInt(v) || 7 })} type="number" />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}
