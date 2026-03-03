import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface TenantSettings {
  name: string;
  slug: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  primaryColor: string;
  estimatedDeliveryMin: number;
  minimumOrder: number;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  autoConfirmOrders: boolean;
  feedbackEnabled: boolean;
  reengagementDays: number;
}

export default function SettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: { tenant: TenantSettings } }>('/api/tenant/profile', { token })
      .then((res) => setForm(res.data.tenant as TenantSettings))
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiFetch('/api/tenant/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
        token,
      });
      toast.success('Configurações salvas!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="text-center text-gray-500 py-8">Carregando...</div>;

  const updateField = (field: string, value: any) => setForm({ ...form, [field]: value });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
        >
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Basic Info */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold">Informações Básicas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome" value={form.name} onChange={(v) => updateField('name', v)} />
          <Field label="Slug" value={form.slug} onChange={(v) => updateField('slug', v)} />
          <Field label="Telefone (WhatsApp)" value={form.phone || ''} onChange={(v) => updateField('phone', v)} />
          <Field label="Cor Primária" value={form.primaryColor || '#f97316'} onChange={(v) => updateField('primaryColor', v)} type="color" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold">Endereço</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Endereço" value={form.address || ''} onChange={(v) => updateField('address', v)} className="sm:col-span-2" />
          <Field label="Cidade" value={form.city || ''} onChange={(v) => updateField('city', v)} />
          <Field label="Estado" value={form.state || ''} onChange={(v) => updateField('state', v)} />
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold">Entregas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Tempo estimado (min)"
            value={String(form.estimatedDeliveryMin || 40)}
            onChange={(v) => updateField('estimatedDeliveryMin', parseInt(v) || 40)}
            type="number"
          />
          <Field
            label="Pedido mínimo (R$)"
            value={String(form.minimumOrder || 0)}
            onChange={(v) => updateField('minimumOrder', parseFloat(v) || 0)}
            type="number"
          />
          <Toggle label="Aceita Delivery" checked={form.acceptsDelivery} onChange={(v) => updateField('acceptsDelivery', v)} />
          <Toggle label="Aceita Retirada" checked={form.acceptsPickup} onChange={(v) => updateField('acceptsPickup', v)} />
        </div>
      </section>

      {/* Automation */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold">Automações</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Toggle label="Auto-confirmar pedidos" checked={form.autoConfirmOrders} onChange={(v) => updateField('autoConfirmOrders', v)} />
          <Toggle label="Feedback habilitado" checked={form.feedbackEnabled} onChange={(v) => updateField('feedbackEnabled', v)} />
          <Field
            label="Dias para re-engajamento"
            value={String(form.reengagementDays || 7)}
            onChange={(v) => updateField('reengagementDays', parseInt(v) || 7)}
            type="number"
          />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <div className={`w-10 h-6 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-gray-300'} relative`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition ${checked ? 'left-5' : 'left-1'}`} />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  );
}
