import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
export async function sendAccountMail({ user, url }, purpose) {
  const subject = purpose === 'reset' ? 'Reset your EnterpriseQR password' : 'Verify your EnterpriseQR email';
  const text = `${subject}\n\n${url}\n\nIf you did not request this, ignore this email.`;
  if (process.env.APP_MODE === 'local') {
    await mkdir('.data/mail', { recursive: true });
    await writeFile(`.data/mail/${randomUUID()}.json`, JSON.stringify({ to: user.email, subject, text, createdAt: new Date() }, null, 2), { mode: 0o600 });
    return;
  }
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) throw new Error('Configure email delivery before enabling accounts.');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', requireTLS: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 10000, socketTimeout: 15000 });
  await transport.sendMail({ from: process.env.MAIL_FROM, to: user.email, subject, text });
}
