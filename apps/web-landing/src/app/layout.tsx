import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from './components/CookieConsent';

export const metadata: Metadata = {
  title: 'Pedirei.Online — Cardápio Digital + WhatsApp com IA para Restaurantes',
  description:
    'Automatize pedidos via WhatsApp com inteligência artificial. Cardápio digital, gestão completa e chatbot inteligente para restaurantes. Comece grátis!',
  keywords: 'cardápio digital, pedidos whatsapp, restaurante, chatbot ia, delivery',
  openGraph: {
    title: 'Pedirei.Online — Pedidos via WhatsApp com IA',
    description: 'Cardápio digital + WhatsApp chatbot para restaurantes',
    url: 'https://pedirei.online',
    siteName: 'Pedirei.Online',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
