'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-lg mx-auto bg-white border shadow-lg rounded-xl px-5 py-4 flex items-center gap-4 pointer-events-auto">
        <p className="text-xs text-gray-600 flex-1">
          Usamos cookies essenciais para o funcionamento do site.{' '}
          <Link href="/privacidade" className="text-brand-600 hover:underline">Saiba mais</Link>
        </p>
        <button
          onClick={accept}
          className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition whitespace-nowrap"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
