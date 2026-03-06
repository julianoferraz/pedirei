import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import {
  Sparkles,
  FileText,
  TrendingUp,
  BarChart3,
  Loader2,
  Copy,
  Zap,
} from 'lucide-react';

type Tab = 'description' | 'pricing' | 'usage';

export default function AiToolsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('description');

  const tabs: { key: Tab; icon: typeof Sparkles; label: string }[] = [
    { key: 'description', icon: FileText, label: 'Gerar Descrição' },
    { key: 'pricing', icon: TrendingUp, label: 'Análise de Preços' },
    { key: 'usage', icon: BarChart3, label: 'Uso da IA' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-brand-600" size={28} />
          Sugestões com IA
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Ferramentas de inteligência artificial para otimizar seu cardápio e aumentar vendas
        </p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'description' && <DescriptionGenerator token={token!} />}
      {tab === 'pricing' && <PriceAnalysis token={token!} />}
      {tab === 'usage' && <UsageStats token={token!} />}
    </div>
  );
}

// ── Description Generator ───────────────────────────────────

function DescriptionGenerator({ token }: { token: string }) {
  const [form, setForm] = useState({
    itemName: '',
    category: '',
    ingredients: '',
    style: 'casual' as 'casual' | 'gourmet' | 'fast-food',
  });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!form.itemName.trim()) return toast.error('Informe o nome do item');
    setLoading(true);
    setResult('');
    try {
      const res = await apiFetch<{ success: boolean; data: { description: string } }>(
        '/api/ai/generate-description',
        { token, method: 'POST', body: JSON.stringify(form) },
      );
      setResult(res.data.description);
    } catch {
      toast.error('Erro ao gerar descrição');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copiado!');
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl space-y-5">
      <div>
        <p className="font-semibold text-gray-900 mb-1">Gerador de Descrições</p>
        <p className="text-sm text-gray-400">
          A IA cria descrições atrativas para seus itens do cardápio
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do item *</label>
          <input
            type="text"
            placeholder="Ex: X-Bacon Especial"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <input
              type="text"
              placeholder="Ex: Hambúrgueres"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estilo</label>
            <select
              value={form.style}
              onChange={(e) => setForm({ ...form, style: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="casual">Casual</option>
              <option value="gourmet">Gourmet</option>
              <option value="fast-food">Fast Food</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingredientes (opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: pão brioche, carne 180g, bacon crocante, queijo cheddar"
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Zap size={16} />
        )}
        {loading ? 'Gerando...' : 'Gerar descrição'}
      </button>

      {result && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-800 flex-1">{result}</p>
            <button
              onClick={copy}
              className="p-1.5 hover:bg-amber-100 rounded-lg shrink-0"
              title="Copiar"
            >
              <Copy size={14} className="text-amber-600" />
            </button>
          </div>
          <p className="text-xs text-amber-500 mt-2">Copie e cole na descrição do item no cardápio</p>
        </div>
      )}
    </div>
  );
}

// ── Price Analysis ──────────────────────────────────────────

interface Insight {
  item: string;
  suggestion: string;
}

function PriceAnalysis({ token }: { token: string }) {
  const [analysis, setAnalysis] = useState<{ insights: Insight[]; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await apiFetch<{ success: boolean; data: { insights: Insight[]; summary: string } }>(
        '/api/ai/price-analysis',
        { token, method: 'POST', body: JSON.stringify({}) },
      );
      setAnalysis(res.data);
    } catch {
      toast.error('Erro ao analisar preços');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl space-y-5">
      <div>
        <p className="font-semibold text-gray-900 mb-1">Análise de Preços</p>
        <p className="text-sm text-gray-400">
          A IA analisa seus preços e sugere otimizações baseadas no mercado
        </p>
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <TrendingUp size={16} />
        )}
        {loading ? 'Analisando...' : 'Analisar meu cardápio'}
      </button>

      {analysis && (
        <div className="space-y-4">
          {analysis.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">{analysis.summary}</p>
            </div>
          )}

          {analysis.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Sugestões por item:</p>
              {analysis.insights.map((insight, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 flex gap-3">
                  <span className="text-sm font-semibold text-gray-800 shrink-0">
                    {insight.item}
                  </span>
                  <span className="text-sm text-gray-600">{insight.suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Usage Stats ─────────────────────────────────────────────

function UsageStats({ token }: { token: string }) {
  const [usage, setUsage] = useState<{
    model: string;
    monthlyTokens: number;
    tokenLimit: number | null;
    last30Days: { requests: number; tokens: number; cost: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    apiFetch<{ success: boolean; data: typeof usage }>('/api/ai/usage', { token })
      .then((r) => setUsage(r.data))
      .catch(() => toast.error('Erro ao carregar uso'))
      .finally(() => setLoading(false));
  });

  if (loading && !usage) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!usage) return null;

  const pct = usage.tokenLimit
    ? Math.min(100, (usage.monthlyTokens / usage.tokenLimit) * 100)
    : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="text-sm text-gray-500">Requisições (30d)</p>
          <p className="text-2xl font-bold text-gray-900">{usage.last30Days.requests}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="text-sm text-gray-500">Tokens usados (30d)</p>
          <p className="text-2xl font-bold text-gray-900">
            {(usage.last30Days.tokens / 1000).toFixed(1)}k
          </p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="text-sm text-gray-500">Custo estimado (30d)</p>
          <p className="text-2xl font-bold text-gray-900">
            ${usage.last30Days.cost.toFixed(4)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Modelo: <strong>{usage.model}</strong></span>
          {usage.tokenLimit && (
            <span className="text-gray-500">
              {(usage.monthlyTokens / 1000).toFixed(0)}k / {(usage.tokenLimit / 1000).toFixed(0)}k tokens
            </span>
          )}
        </div>
        {usage.tokenLimit && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-brand-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
