// Sends the reset code over SMTP, so any provider works without code changes:
// Gmail (app password), Brevo, or Resend once you have a domain.
// With no SMTP_HOST in emulator mode, the code is printed to the server log
// and kept in a dev-only outbox instead of being emailed.
import nodemailer from 'nodemailer';

const outbox = globalThis.__fwOtpOutbox || (globalThis.__fwOtpOutbox = []);
export const devOutbox = () => outbox;

let transport;

function html(code, minutes) {
  return `<!doctype html><html><body style="margin:0;background:#FFF9F0;font-family:Nunito,Arial,sans-serif;color:#3D3533">
  <div style="max-width:440px;margin:0 auto;padding:32px 24px">
    <div style="font-size:24px;font-weight:800">FridgeWise</div>
    <p style="font-size:16px;line-height:1.5;margin:24px 0 8px">Here's your code to set a new password:</p>
    <div style="font-size:36px;font-weight:800;letter-spacing:8px;background:#fff;border-radius:16px;padding:16px;text-align:center">${code}</div>
    <p style="font-size:14px;line-height:1.5;color:#6B6663;margin:16px 0 0">It works for ${minutes} minutes. If you didn't ask for this, you can ignore this email. Your password won't change.</p>
  </div></body></html>`;
}

export async function sendOtpEmail(to, code, minutes) {
  if (!process.env.SMTP_HOST) {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('SMTP_HOST is not set');
    console.log(`[otp] dev mode, not emailed. Code for ${to}: ${code}`);
    outbox.push({ to, code, at: Date.now() });
    if (outbox.length > 50) outbox.shift();
    return;
  }
  const info = await getTransport().sendMail({
    from: mailFrom(),
    to,
    subject: `${code} is your FridgeWise reset code`,
    text: `Your FridgeWise code to set a new password is ${code}. It works for ${minutes} minutes. If you didn't ask for this, ignore this email.`,
    html: html(code, minutes)
  });
  if (!process.env.VERCEL) console.log(`[otp] emailed a code to ${to} via ${process.env.SMTP_HOST} (${info.response || info.messageId})`);
}

export function mailFrom() {
  return (process.env.MAIL_FROM || '').trim() || `FridgeWise <${(process.env.SMTP_USER || '').trim()}>`;
}

export function getTransport() {
  if (transport) return transport;
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  // Gmail shows app passwords as "abcd efgh ijkl mnop"; the spaces aren't part of it.
  let pass = (process.env.SMTP_PASS || '').trim();
  if (/gmail\.com$/i.test(host)) pass = pass.replace(/\s+/g, '');
  if (!user || !pass) throw new Error('SMTP_USER and SMTP_PASS must be set when SMTP_HOST is set');
  const port = Number(process.env.SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  return transport;
}
