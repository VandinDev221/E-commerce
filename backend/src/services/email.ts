import { Resend } from 'resend';
import { config } from '../config/index.js';

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

export async function sendVerificationEmail(email: string, token: string) {
  if (!resend) {
    console.log('[Email] Verificação (dev):', email, token);
    return;
  }
  const url = `${config.frontendUrl}/auth/verify-email?token=${token}`;
  await resend.emails.send({
    from: config.resend.from,
    to: email,
    subject: 'Confirme seu e-mail',
    html: `<p>Clique no link para confirmar: <a href="${url}">${url}</a></p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!resend) {
    console.log('[Email] Reset senha (dev):', email, token);
    return;
  }
  const url = `${config.frontendUrl}/auth/reset-password?token=${token}`;
  await resend.emails.send({
    from: config.resend.from,
    to: email,
    subject: 'Recuperação de senha',
    html: `<p>Clique para redefinir sua senha: <a href="${url}">${url}</a></p>`,
  });
}

export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  total: string
) {
  if (!resend) {
    console.log('[Email] Pedido (dev):', email, orderNumber, total);
    return;
  }
  await resend.emails.send({
    from: config.resend.from,
    to: email,
    subject: `Pedido #${orderNumber} confirmado`,
    html: `<p>Seu pedido <strong>#${orderNumber}</strong> foi confirmado. Total: ${total}</p>`,
  });
}
