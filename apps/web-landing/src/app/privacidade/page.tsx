import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade — Pedirei.Online',
  description: 'Política de Privacidade e proteção de dados da plataforma Pedirei.Online',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold text-brand-600">🍔 Pedirei.Online</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-400 mb-10">Última atualização: Março de 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introdução</h2>
            <p>A Pedirei.Online (&quot;nós&quot;, &quot;nosso&quot;) está comprometida com a proteção de seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Dados que Coletamos</h2>
            <p><strong>Dados de cadastro:</strong> nome, e-mail, telefone, nome do estabelecimento.</p>
            <p><strong>Dados de uso:</strong> informações sobre como você interage com a Plataforma, como páginas visitadas e funcionalidades utilizadas.</p>
            <p><strong>Dados de clientes (do seu restaurante):</strong> nome, telefone e histórico de pedidos dos clientes do seu estabelecimento, armazenados por você através da plataforma.</p>
            <p><strong>Dados de pagamento:</strong> não armazenamos dados de cartão de crédito diretamente. Os pagamentos são processados por terceiros (MercadoPago, Asaas, EfiPay).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Base Legal para Tratamento</h2>
            <p>Tratamos seus dados pessoais com base nas seguintes hipóteses legais previstas na LGPD:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Execução de contrato:</strong> para fornecer os serviços da Plataforma;</li>
              <li><strong>Consentimento:</strong> para envio de comunicações de marketing (que podem ser revogadas a qualquer momento);</li>
              <li><strong>Legítimo interesse:</strong> para melhorias do serviço e análises agregadas;</li>
              <li><strong>Obrigação legal:</strong> para cumprimento de obrigações fiscais (NFC-e).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Como Usamos seus Dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer e manter os serviços contratados;</li>
              <li>Processar pedidos e pagamentos;</li>
              <li>Enviar notificações operacionais (status de pedidos, alertas do sistema);</li>
              <li>Enviar comunicações de marketing (apenas com seu consentimento);</li>
              <li>Melhorar e personalizar a experiência na Plataforma;</li>
              <li>Gerar relatórios e análises agregadas (dados anonimizados);</li>
              <li>Cumprir obrigações legais e tributárias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Compartilhamento de Dados</h2>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Processadores de pagamento:</strong> MercadoPago, Asaas, EfiPay — para processamento de transações;</li>
              <li><strong>Provedores de infraestrutura:</strong> serviços de hospedagem e armazenamento;</li>
              <li><strong>OpenAI:</strong> mensagens de chat (anonimizadas) para processamento pelo chatbot com IA;</li>
              <li><strong>Autoridades competentes:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
            <p className="mt-2">Não vendemos seus dados pessoais a terceiros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Armazenamento e Segurança</h2>
            <p>Seus dados são armazenados em servidores seguros com:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Criptografia de dados sensíveis em repouso e em trânsito (HTTPS/TLS);</li>
              <li>Isolamento de dados por tenant (multi-tenant com separação lógica);</li>
              <li>Backups periódicos;</li>
              <li>Controle de acesso baseado em funções (RBAC).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Seus Direitos (LGPD)</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e acessá-los;</li>
              <li><strong>Correção:</strong> solicitar correção de dados incompletos ou desatualizados;</li>
              <li><strong>Anonimização ou eliminação:</strong> solicitar a anonimização ou exclusão de dados desnecessários;</li>
              <li><strong>Portabilidade:</strong> solicitar a portabilidade de seus dados;</li>
              <li><strong>Revogação do consentimento:</strong> revogar o consentimento para tratamentos baseados nesta hipótese;</li>
              <li><strong>Informação sobre compartilhamento:</strong> saber com quais terceiros seus dados são compartilhados;</li>
              <li><strong>Oposição:</strong> opor-se a tratamentos realizados com base em legítimo interesse.</li>
            </ul>
            <p className="mt-2">Para exercer qualquer desses direitos, envie um e-mail para <a href="mailto:privacidade@pedirei.online" className="text-brand-600 hover:underline">privacidade@pedirei.online</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>Utilizamos cookies estritamente necessários para o funcionamento da Plataforma:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Cookies de sessão:</strong> para manter sua autenticação;</li>
              <li><strong>Cookies de preferência:</strong> para lembrar suas configurações.</li>
            </ul>
            <p className="mt-2">Não utilizamos cookies de rastreamento ou publicidade de terceiros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Retenção de Dados</h2>
            <p>Mantemos seus dados pelo tempo necessário para prestar os serviços. Após o cancelamento da conta, seus dados são mantidos por 30 dias (para possível reativação) e, em seguida, permanentemente excluídos, exceto dados necessários para obrigações legais (ex.: notas fiscais, que devem ser mantidas por 5 anos).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Controlador e Encarregado (DPO)</h2>
            <p><strong>Controlador:</strong> Pedirei.Online</p>
            <p><strong>Encarregado de Dados:</strong> contato@pedirei.online</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Alterações</h2>
            <p>Esta política pode ser atualizada periodicamente. Alterações significativas serão notificadas por e-mail ou dentro da Plataforma.</p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Pedirei.Online</span>
          <div className="flex gap-6">
            <Link href="/termos" className="hover:text-gray-700">Termos</Link>
            <Link href="/privacidade" className="text-brand-600 font-medium">Privacidade</Link>
            <Link href="/contato" className="hover:text-gray-700">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
