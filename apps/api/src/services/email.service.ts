import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM_EMAIL = env.FROM_EMAIL || 'Pedirei.Online <noreply@pedirei.online>';

export async function sendWelcomeEmail(to: string, name: string, confirmToken: string) {
  if (!resend) {
    logger.warn('RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const confirmUrl = `${env.API_URL}/api/auth/confirm?token=${confirmToken}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Bem-vindo ao Pedirei.Online! Confirme seu e-mail',
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#f97316;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:24px;">🍔 Pedirei.Online</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Olá, ${name}!</h2>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Sua conta foi criada com sucesso. Para começar a receber pedidos, confirme seu e-mail clicando no botão abaixo:
      </p>
      <a href="${confirmUrl}" style="display:inline-block;padding:12px 32px;background:#f97316;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        Confirmar E-mail
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.5;">
        Se o botão não funcionar, copie e cole este link no navegador:<br>
        <a href="${confirmUrl}" style="color:#f97316;word-break:break-all;">${confirmUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px;">
        <strong>Próximos passos:</strong>
      </p>
      <ol style="color:#6b7280;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Confirme seu e-mail</li>
        <li>Acesse o <a href="${env.ADMIN_URL}" style="color:#f97316;">painel administrativo</a></li>
        <li>Monte seu cardápio digital</li>
        <li>Conecte seu WhatsApp</li>
        <li>Comece a receber pedidos!</li>
      </ol>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">
        © ${new Date().getFullYear()} Pedirei.Online — Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });
    logger.info({ to }, 'Welcome email sent');
  } catch (err) {
    logger.error({ err, to }, 'Failed to send welcome email');
  }
}

export async function sendContactEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  if (!resend) {
    logger.warn('RESEND_API_KEY not set — skipping contact email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: env.MASTER_EMAIL || 'contato@pedirei.online',
      replyTo: data.email,
      subject: `[Contato] ${data.subject} — ${data.name}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#f97316;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">Nova Mensagem de Contato</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;"><strong>Nome:</strong> ${data.name}</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;"><strong>E-mail:</strong> ${data.email}</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 16px;"><strong>Assunto:</strong> ${data.subject}</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;">
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${data.message}</p>
      </div>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });
    logger.info({ email: data.email }, 'Contact email sent');
  } catch (err) {
    logger.error({ err }, 'Failed to send contact email');
  }
}
