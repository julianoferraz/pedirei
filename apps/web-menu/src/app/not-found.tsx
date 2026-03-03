export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <h2 className="text-xl font-semibold text-gray-700">Restaurante não encontrado</h2>
        <p className="text-gray-500">
          Verifique o endereço ou entre em contato com o restaurante.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
        >
          Voltar ao início
        </a>
      </div>
    </main>
  );
}
