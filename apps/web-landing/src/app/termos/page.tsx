import Link from 'next/link';

export const metadata = {
  title: 'Termos de Uso — Pedirei.Online',
  description: 'Termos de Uso da plataforma Pedirei.Online',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold text-brand-600">🍔 Pedirei.Online</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-gray-400 mb-10">Última atualização: Março de 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar ou utilizar a plataforma Pedirei.Online (&quot;Plataforma&quot;), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o serviço.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p>A Pedirei.Online é uma plataforma SaaS (Software como Serviço) que oferece:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Cardápio digital personalizado para restaurantes e estabelecimentos alimentícios;</li>
              <li>Chatbot com inteligência artificial para atendimento via WhatsApp;</li>
              <li>Painel de gestão de pedidos, clientes e relatórios;</li>
              <li>Integração com gateways de pagamento (PIX, cartão de crédito/débito);</li>
              <li>Emissão de NFC-e (Nota Fiscal do Consumidor Eletrônica).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Cadastro e Conta</h2>
            <p>Para utilizar a Plataforma, você deve criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram sob sua conta.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Planos e Pagamento</h2>
            <p>A Plataforma oferece planos gratuitos e pagos. Os planos pagos são cobrados mensalmente e podem ser cancelados a qualquer momento, sem multa. Ao fazer upgrade de plano, a cobrança é proporcional ao período restante do ciclo de faturamento.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Uso Aceitável</h2>
            <p>Você concorda em não:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Utilizar a Plataforma para fins ilegais ou não autorizados;</li>
              <li>Transmitir vírus, malware ou código malicioso;</li>
              <li>Tentar acessar dados de outros usuários sem autorização;</li>
              <li>Sobrecarregar ou interferir na infraestrutura da Plataforma;</li>
              <li>Revender ou sublicenciar o acesso à Plataforma sem autorização.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Propriedade Intelectual</h2>
            <p>Todo o conteúdo da Plataforma, incluindo código-fonte, design, logotipos e textos, é de propriedade exclusiva da Pedirei.Online. Os dados inseridos pelo usuário (cardápio, informações de clientes, etc.) permanecem de propriedade do usuário.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Disponibilidade do Serviço</h2>
            <p>Nos esforçamos para manter a Plataforma disponível 24/7, porém não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Limitação de Responsabilidade</h2>
            <p>A Pedirei.Online não será responsável por danos indiretos, incidentais, consequenciais ou punitivos decorrentes do uso ou impossibilidade de uso da Plataforma, incluindo perda de lucros, dados ou oportunidades de negócio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Cancelamento</h2>
            <p>Você pode cancelar sua conta a qualquer momento. Após o cancelamento, seus dados serão mantidos por 30 dias para possível reativação e, depois, permanentemente excluídos conforme nossa Política de Privacidade.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Alterações nos Termos</h2>
            <p>Reservamo-nos o direito de alterar estes termos a qualquer momento. Alterações significativas serão notificadas por e-mail ou dentro da Plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Foro</h2>
            <p>Estes termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas serão resolvidas no foro da comarca de domicílio do usuário consumidor, conforme previsto no Código de Defesa do Consumidor.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato pelo e-mail <a href="mailto:contato@pedirei.online" className="text-brand-600 hover:underline">contato@pedirei.online</a>.</p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Pedirei.Online</span>
          <div className="flex gap-6">
            <Link href="/termos" className="text-brand-600 font-medium">Termos</Link>
            <Link href="/privacidade" className="hover:text-gray-700">Privacidade</Link>
            <Link href="/contato" className="hover:text-gray-700">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
