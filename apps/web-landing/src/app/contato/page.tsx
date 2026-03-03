'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContatoPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://api.pedirei.online/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold text-brand-600">🍔 Pedirei.Online</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Contato</h1>
        <p className="text-gray-500 mb-10">Envie sua mensagem e responderemos em até 24 horas.</p>

        {status === 'sent' ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-700 font-semibold text-lg mb-1">Mensagem enviada!</p>
            <p className="text-green-600 text-sm">Obrigado pelo contato. Responderemos em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                placeholder="Seu nome"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
              <select
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
              >
                <option value="">Selecione...</option>
                <option value="suporte">Suporte Técnico</option>
                <option value="comercial">Informações Comerciais</option>
                <option value="privacidade">Proteção de Dados (LGPD)</option>
                <option value="parceria">Parcerias</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                placeholder="Descreva como podemos ajudar..."
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm">Erro ao enviar. Tente novamente ou envie para contato@pedirei.online.</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition"
            >
              {status === 'sending' ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        )}

        <div className="mt-12 pt-8 border-t text-sm text-gray-500 space-y-2">
          <p><strong className="text-gray-700">E-mail:</strong> contato@pedirei.online</p>
          <p><strong className="text-gray-700">Privacidade/LGPD:</strong> privacidade@pedirei.online</p>
        </div>
      </main>

      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Pedirei.Online</span>
          <div className="flex gap-6">
            <Link href="/termos" className="hover:text-gray-700">Termos</Link>
            <Link href="/privacidade" className="hover:text-gray-700">Privacidade</Link>
            <Link href="/contato" className="text-brand-600 font-medium">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
