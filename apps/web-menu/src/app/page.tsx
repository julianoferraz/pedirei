export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand-600 mb-4">🍔 Pedirei.Online</h1>
        <p className="text-gray-600 text-lg mb-8">Acesse o cardápio digital do seu restaurante favorito</p>
        <p className="text-sm text-gray-400">
          Acesse via: <code className="bg-gray-100 px-2 py-1 rounded">seurestaurante.pedirei.online</code>
        </p>
      </div>
    </main>
  );
}
