import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import {
  QrCode,
  Plus,
  Trash2,
  Edit2,
  Layers,
  ToggleLeft,
  ToggleRight,
  Download,
  Printer,
  X,
  Check,
  Users,
} from 'lucide-react';

interface DineInTable {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  isActive: boolean;
}

interface TenantInfo {
  slug: string;
  name: string;
  dineInEnabled: boolean;
}

const MENU_BASE_URL = 'https://pedirei.online';

function buildTableUrl(slug: string, tableNumber: number) {
  return `${MENU_BASE_URL}/${slug}?mesa=${tableNumber}`;
}

function qrImageUrl(data: string, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png`;
}

export default function TableManagementPage() {
  const { token } = useAuth();
  const [tables, setTables] = useState<DineInTable[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [editing, setEditing] = useState<DineInTable | null>(null);
  const [qrModal, setQrModal] = useState<DineInTable | null>(null);

  // Create form
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  // Batch form
  const [batchFrom, setBatchFrom] = useState('1');
  const [batchTo, setBatchTo] = useState('10');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('4');

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, tenantRes] = await Promise.all([
        apiFetch<{ data: DineInTable[] }>('/api/tables', { token }).catch(() => ({ data: [] as DineInTable[] })),
        apiFetch<{ data: { tenant: TenantInfo } }>('/api/tenant/profile', { token }),
      ]);
      setTables(tablesRes.data || []);
      const t = tenantRes.data.tenant;
      setTenant({ slug: t.slug, name: t.name, dineInEnabled: (t as any).dineInEnabled ?? false });
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleDineIn() {
    if (!tenant) return;
    try {
      await apiFetch('/api/tenant/dine-in', {
        method: 'PUT',
        body: JSON.stringify({ dineInEnabled: !tenant.dineInEnabled }),
        token,
      });
      setTenant({ ...tenant, dineInEnabled: !tenant.dineInEnabled });
      toast.success(tenant.dineInEnabled ? 'Garçom Digital desativado' : 'Garçom Digital ativado');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleCreate() {
    const num = parseInt(newNumber);
    if (!num || num < 1) { toast.error('Número inválido'); return; }
    try {
      await apiFetch('/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: num, name: newName || undefined, capacity: parseInt(newCapacity) || 4 }),
        token,
      });
      toast.success(`Mesa ${num} criada!`);
      setShowCreate(false);
      setNewNumber('');
      setNewName('');
      setNewCapacity('4');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBatch() {
    const from = parseInt(batchFrom);
    const to = parseInt(batchTo);
    if (!from || !to || from > to) { toast.error('Intervalo inválido'); return; }
    if (to - from > 99) { toast.error('Máximo 100 mesas por vez'); return; }
    try {
      await apiFetch('/api/tables/batch', {
        method: 'POST',
        body: JSON.stringify({ from, to }),
        token,
      });
      toast.success(`Mesas ${from}–${to} criadas!`);
      setShowBatch(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    try {
      await apiFetch(`/api/tables/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName || null, capacity: parseInt(editCapacity) || 4, isActive: editing.isActive }),
        token,
      });
      toast.success('Mesa atualizada!');
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(table: DineInTable) {
    if (!confirm(`Excluir mesa ${table.number}?`)) return;
    try {
      await apiFetch(`/api/tables/${table.id}`, { method: 'DELETE', token });
      toast.success('Mesa excluída');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleToggleActive(table: DineInTable) {
    try {
      await apiFetch(`/api/tables/${table.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !table.isActive }),
        token,
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function startEdit(table: DineInTable) {
    setEditing(table);
    setEditName(table.name || '');
    setEditCapacity(String(table.capacity));
  }

  function printAllQrCodes() {
    if (!tenant) return;
    const activeTables = tables.filter((t) => t.isActive);
    const w = window.open('', '_blank');
    if (!w) return;

    const html = `<!DOCTYPE html>
<html><head><title>QR Codes - ${tenant.name}</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .card { text-align: center; border: 1px solid #ddd; border-radius: 8px; padding: 16px; break-inside: avoid; }
  .card img { width: 160px; height: 160px; }
  .card h3 { margin: 8px 0 4px; font-size: 18px; }
  .card p { margin: 0; font-size: 12px; color: #666; }
  @media print { .grid { grid-template-columns: repeat(3, 1fr); } }
</style></head><body>
<h1 style="text-align:center;margin-bottom:20px">${tenant.name} — QR Codes das Mesas</h1>
<div class="grid">
${activeTables.map((t) => {
  const url = buildTableUrl(tenant.slug, t.number);
  return `<div class="card">
    <img src="${qrImageUrl(url, 160)}" alt="Mesa ${t.number}" />
    <h3>Mesa ${t.number}</h3>
    ${t.name ? `<p>${t.name}</p>` : ''}
    <p style="font-size:10px;color:#999">${url}</p>
  </div>`;
}).join('')}
</div>
<script>setTimeout(()=>window.print(),1000)</script>
</body></html>`;

    w.document.write(html);
    w.document.close();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  const activeTables = tables.filter((t) => t.isActive);
  const inactiveTables = tables.filter((t) => !t.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <QrCode className="text-brand-600" size={24} />
          <h1 className="text-xl font-bold">Garçom Digital — Mesas</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDineIn}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tenant?.dineInEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tenant?.dineInEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {tenant?.dineInEnabled ? 'Ativo' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      {!tenant?.dineInEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>Garçom Digital desativado.</strong> Ative para que os clientes possam escanear o QR Code
          da mesa e fazer pedidos diretamente pelo celular.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setShowCreate(true); setShowBatch(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
        >
          <Plus size={16} /> Nova Mesa
        </button>
        <button
          onClick={() => { setShowBatch(true); setShowCreate(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          <Layers size={16} /> Criar em Lote
        </button>
        {activeTables.length > 0 && (
          <button
            onClick={printAllQrCodes}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            <Printer size={16} /> Imprimir QR Codes
          </button>
        )}
      </div>

      {/* Create single table form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
          <h3 className="font-semibold">Nova Mesa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Número *</label>
              <input
                type="number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                min={1}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="Ex: 1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Nome (opcional)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="Ex: Varanda"
                maxLength={50}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Capacidade</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                min={1}
                max={99}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
            >
              Criar Mesa
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Batch create form */}
      {showBatch && (
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
          <h3 className="font-semibold">Criar Mesas em Lote</h3>
          <p className="text-xs text-gray-500">Cria mesas numeradas de X até Y (capacidade padrão: 4)</p>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-500">De</label>
              <input
                type="number"
                value={batchFrom}
                onChange={(e) => setBatchFrom(e.target.value)}
                min={1}
                className="w-24 mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Até</label>
              <input
                type="number"
                value={batchTo}
                onChange={(e) => setBatchTo(e.target.value)}
                min={1}
                className="w-24 mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <button
              onClick={handleBatch}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
            >
              Criar {Math.max(0, (parseInt(batchTo) || 0) - (parseInt(batchFrom) || 0) + 1)} Mesas
            </button>
            <button onClick={() => setShowBatch(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
          <h3 className="font-semibold">Editando Mesa {editing.number}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Nome (opcional)</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                maxLength={50}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Capacidade</label>
              <input
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                min={1}
                max={99}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpdate} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition">
              Salvar
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <QrCode size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Nenhuma mesa cadastrada</p>
          <p className="text-sm">Crie mesas individuais ou em lote para começar</p>
        </div>
      ) : (
        <>
          {/* Active */}
          {activeTables.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Ativas ({activeTables.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {activeTables
                  .sort((a, b) => a.number - b.number)
                  .map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      slug={tenant?.slug || ''}
                      onEdit={() => startEdit(table)}
                      onDelete={() => handleDelete(table)}
                      onToggle={() => handleToggleActive(table)}
                      onQr={() => setQrModal(table)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Inactive */}
          {inactiveTables.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Inativas ({inactiveTables.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {inactiveTables
                  .sort((a, b) => a.number - b.number)
                  .map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      slug={tenant?.slug || ''}
                      onEdit={() => startEdit(table)}
                      onDelete={() => handleDelete(table)}
                      onToggle={() => handleToggleActive(table)}
                      onQr={() => setQrModal(table)}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* QR modal */}
      {qrModal && tenant && (
        <QrModal
          table={qrModal}
          slug={tenant.slug}
          tenantName={tenant.name}
          onClose={() => setQrModal(null)}
        />
      )}
    </div>
  );
}

// ─── Table Card ─────────────────────────────────────────────

function TableCard({
  table,
  slug,
  onEdit,
  onDelete,
  onToggle,
  onQr,
}: {
  table: DineInTable;
  slug: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onQr: () => void;
}) {
  const url = buildTableUrl(slug, table.number);

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col items-center gap-2 transition ${
        table.isActive ? 'border-gray-200' : 'border-gray-100 opacity-50'
      }`}
    >
      {/* QR code thumbnail */}
      <button onClick={onQr} className="hover:scale-105 transition" title="Ver QR Code">
        <img
          src={qrImageUrl(url, 120)}
          alt={`QR Mesa ${table.number}`}
          className="w-20 h-20 rounded"
          loading="lazy"
        />
      </button>

      <div className="text-center">
        <p className="font-bold text-lg">Mesa {table.number}</p>
        {table.name && <p className="text-xs text-gray-500">{table.name}</p>}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
          <Users size={12} />
          <span>{table.capacity} lugares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 mt-1">
        <button onClick={onQr} className="p-1.5 hover:bg-gray-100 rounded" title="QR Code">
          <QrCode size={14} className="text-brand-600" />
        </button>
        <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded" title="Editar">
          <Edit2 size={14} className="text-gray-500" />
        </button>
        <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded" title={table.isActive ? 'Desativar' : 'Ativar'}>
          {table.isActive ? (
            <ToggleRight size={14} className="text-green-500" />
          ) : (
            <ToggleLeft size={14} className="text-gray-400" />
          )}
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded" title="Excluir">
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────

function QrModal({
  table,
  slug,
  tenantName,
  onClose,
}: {
  table: DineInTable;
  slug: string;
  tenantName: string;
  onClose: () => void;
}) {
  const url = buildTableUrl(slug, table.number);
  const imgSrc = qrImageUrl(url, 300);

  function download() {
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = `qr-mesa-${table.number}.png`;
    a.click();
  }

  function printSingle() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>QR Mesa ${table.number}</title>
<style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0}
img{width:250px;height:250px}h2{margin:16px 0 4px}p{margin:0;color:#666;font-size:14px}
.url{font-size:10px;color:#999;margin-top:8px}</style></head><body>
<h2>${tenantName}</h2><p>Mesa ${table.number}${table.name ? ` — ${table.name}` : ''}</p>
<img src="${imgSrc}" /><p class="url">${url}</p>
<script>setTimeout(()=>window.print(),800)</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Mesa {table.number}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center">
          <img src={imgSrc} alt={`QR Mesa ${table.number}`} className="w-64 h-64 rounded-lg" />
        </div>

        <div className="text-center">
          {table.name && <p className="text-sm text-gray-600 font-medium">{table.name}</p>}
          <p className="text-xs text-gray-400 mt-1 break-all">{url}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={download}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
          >
            <Download size={14} /> Baixar PNG
          </button>
          <button
            onClick={printSingle}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
