import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { toast } from 'sonner';
import {
  Utensils,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Users,
  MapPin,
  List,
  GripVertical,
} from 'lucide-react';
import type { TableWithStatus } from '@pedirei/shared';
import AbrirComandaModal from './AbrirComandaModal';
import ComandaModal from './ComandaModal';

type Tab = 'mapa' | 'config';

interface TableForm {
  number: string;
  label: string;
  capacity: number;
}

const EMPTY_FORM: TableForm = { number: '', label: '', capacity: 4 };

export default function SalaoPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('mapa');
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Config tab state
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TableForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [abrirComandaTable, setAbrirComandaTable] = useState<TableWithStatus | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState<Record<string, { posX: number; posY: number }>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [layoutDirty, setLayoutDirty] = useState(false);

  // ── Fetch tables ─────────────────────────────────────────
  const fetchTables = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: TableWithStatus[] }>('/api/salao/tables', { token });
      setTables(res.data);
    } catch {
      // silent on poll errors
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 8000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  // ── Table CRUD ───────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.number.trim()) return toast.error('Número é obrigatório');
    setSaving(true);
    try {
      await apiFetch('/api/salao/tables', {
        method: 'POST',
        body: JSON.stringify({ number: form.number, label: form.label || undefined, capacity: form.capacity }),
        token,
      });
      toast.success('Mesa criada');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await apiFetch(`/api/salao/tables/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ label: form.label || null, capacity: form.capacity }),
        token,
      });
      toast.success('Mesa atualizada');
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta mesa?')) return;
    try {
      await apiFetch(`/api/salao/tables/${id}`, { method: 'DELETE', token });
      toast.success('Mesa excluída');
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveLayout = async () => {
    const positions = tables.map((t) => ({
      id: t.id,
      posX: localPositions[t.id]?.posX ?? t.posX,
      posY: localPositions[t.id]?.posY ?? t.posY,
    }));
    try {
      await apiFetch('/api/salao/tables/layout', {
        method: 'PUT',
        body: JSON.stringify(positions),
        token,
      });
      toast.success('Layout salvo');
      setLayoutDirty(false);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Drag handlers (native pointer events) ───────────────
  const handlePointerDown = (e: React.PointerEvent, table: TableWithStatus) => {
    if (tab !== 'mapa') return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = localPositions[table.id] ?? { posX: table.posX, posY: table.posY };
    setDraggingId(table.id);
    setDragOffset({ x: e.clientX - rect.left - pos.posX, y: e.clientY - rect.top - pos.posY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newX = Math.max(0, Math.min(rect.width - 100, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
    setLocalPositions((prev) => ({ ...prev, [draggingId]: { posX: Math.round(newX), posY: Math.round(newY) } }));
    setLayoutDirty(true);
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  // ── Table click → open comanda or open session chooser ──
  const handleTableClick = (table: TableWithStatus) => {
    if (draggingId) return; // don't open on drag end
    if (table.status === 'OCCUPIED' && table.session) {
      setActiveSessionId(table.session.id);
    } else {
      setAbrirComandaTable(table);
    }
  };

  const startEdit = (t: TableWithStatus) => {
    setEditingId(t.id);
    setForm({ number: t.number, label: t.label || '', capacity: t.capacity });
  };

  // ── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold">Salão</h1>
        </div>
        {tab === 'mapa' && layoutDirty && (
          <button
            onClick={handleSaveLayout}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600"
          >
            <Save className="h-4 w-4" /> Salvar layout
          </button>
        )}
        {tab === 'config' && (
          <button
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Nova mesa
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('mapa')}
          className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'mapa' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MapPin className="h-4 w-4" /> Mapa de Mesas
        </button>
        <button
          onClick={() => setTab('config')}
          className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'config' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <List className="h-4 w-4" /> Configurar Mesas
        </button>
      </div>

      {/* ─── Mapa Tab ─────────────────────────────────────── */}
      {tab === 'mapa' && (
        <div
          ref={mapRef}
          className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden"
          style={{ minHeight: 500 }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Nenhuma mesa. Vá em "Configurar Mesas" para criar.
            </div>
          )}
          {tables.filter(t => t.isActive).map((table) => {
            const pos = localPositions[table.id] ?? { posX: table.posX, posY: table.posY };
            const occupied = table.status === 'OCCUPIED';
            return (
              <div
                key={table.id}
                onPointerDown={(e) => handlePointerDown(e, table)}
                onClick={() => handleTableClick(table)}
                className={`absolute select-none cursor-grab active:cursor-grabbing rounded-xl shadow-md border-2 p-3 w-28 transition-colors ${
                  occupied
                    ? 'bg-red-50 border-red-400 hover:border-red-500'
                    : 'bg-green-50 border-green-400 hover:border-green-500'
                } ${draggingId === table.id ? 'z-50 shadow-lg scale-105' : 'z-10'}`}
                style={{ left: pos.posX, top: pos.posY, touchAction: 'none' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">#{table.number}</span>
                  <GripVertical className="h-3 w-3 text-gray-400" />
                </div>
                {table.label && (
                  <div className="text-xs text-gray-500 truncate">{table.label}</div>
                )}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Users className="h-3 w-3" /> {table.capacity}
                </div>
                {occupied && table.session && (
                  <div className="mt-1 text-xs font-semibold text-red-600">
                    R$ {(table.session.totalAmount / 100).toFixed(2)}
                  </div>
                )}
                <div
                  className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
                    occupied ? 'text-red-500' : 'text-green-600'
                  }`}
                >
                  {occupied ? 'Ocupada' : 'Livre'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Config Tab ───────────────────────────────────── */}
      {tab === 'config' && (
        <div className="space-y-3">
          {/* Create form */}
          {showCreate && (
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Nova mesa</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Número *</label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome / Apelido</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                    placeholder="Varanda"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Capacidade</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 disabled:opacity-50"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Table list */}
          {tables.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              Nenhuma mesa cadastrada.
            </div>
          ) : (
            <div className="divide-y border rounded-lg bg-white">
              {tables.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  {editingId === t.id ? (
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-bold text-sm">#{t.number}</span>
                      <input
                        type="text"
                        value={form.label}
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                        className="border rounded px-2 py-1 text-sm w-32"
                        placeholder="Apelido"
                      />
                      <input
                        type="number"
                        min={1}
                        value={form.capacity}
                        onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                        className="border rounded px-2 py-1 text-sm w-20"
                      />
                      <button onClick={handleUpdate} disabled={saving} className="text-green-600 hover:text-green-700">
                        <Save className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">#{t.number}</span>
                        {t.label && <span className="text-sm text-gray-500">{t.label}</span>}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {t.capacity}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            t.status === 'OCCUPIED'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {t.status === 'OCCUPIED' ? 'Ocupada' : 'Livre'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-brand-500">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Modais ───────────────────────────────────────── */}
      {abrirComandaTable && (
        <AbrirComandaModal
          table={abrirComandaTable}
          onClose={() => setAbrirComandaTable(null)}
          onOpen={(sessionId) => {
            setAbrirComandaTable(null);
            setActiveSessionId(sessionId);
            fetchTables();
          }}
        />
      )}

      {activeSessionId && (
        <ComandaModal
          sessionId={activeSessionId}
          onClose={() => { setActiveSessionId(null); fetchTables(); }}
        />
      )}
    </div>
  );
}
