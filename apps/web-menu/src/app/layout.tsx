import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cardápio Digital | Pedirei.Online',
  description: 'Faça seu pedido online de forma rápida e fácil',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
