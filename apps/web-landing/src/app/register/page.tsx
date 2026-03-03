'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    storeName: '',
    storeSlug: '',
    phone: '',
    email: '',
    password: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

  const handleStoreNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      storeName: value,
      storeSlug: prev.storeSlug === generateSlug(prev.storeName) || !prev.storeSlug
        ? generateSlug(value)
        : prev.storeSlug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setErrorMsg('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('https://api.pedirei.online/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar conta');
      setStatus('sent');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar conta. Tente novamente.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conta criada com sucesso!</h1>
          <p className="text-gray-600 mb-2">
            Enviamos um e-mail de confirmação para <strong>{form.email}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Clique no link do e-mail para ativar sua conta e acessar o painel administrativo.
          </p>
          <Link
            href="https://admin.pedirei.online"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold transition"
          >
            Acessar Painel <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-50">
      <nav className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-600">🍔 Pedirei.Online</Link>
          <Link
            href="https://admin.pedirei.online"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Já tenho conta
          </Link>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Crie sua conta grátis</h1>
          <p className="text-gray-500 mt-2">Setup em 5 minutos. Sem cartão de crédito.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do restaurante</label>
            <input
              type="text"
              required
              minLength={2}
              value={form.storeName}
              onChange={(e) => handleStoreNameChange(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="Pizzaria do João"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link do cardápio
            </label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-3 bg-gray-50 text-gray-400 text-sm border-r py-2.5">menu.pedirei.online/</span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                pattern="^[a-z0-9-]+$"
                value={form.storeSlug}
                onChange={(e) => setForm({ ...form, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="flex-1 px-3 py-2.5 outline-none"
                placeholder="pizzaria-do-joao"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              type="tel"
              required
              minLength={10}
              maxLength={13}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="11999999999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-500">
              Li e concordo com os{' '}
              <Link href="/termos" className="text-brand-600 hover:underline" target="_blank">Termos de Uso</Link>
              {' '}e a{' '}
              <Link href="/privacidade" className="text-brand-600 hover:underline" target="_blank">Política de Privacidade</Link>.
            </span>
          </label>

          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition"
          >
            {status === 'sending' ? 'Criando conta...' : 'Criar Conta Grátis'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          14 dias de teste grátis com todas as funcionalidades
        </p>
      </main>
    </div>
  );
}
