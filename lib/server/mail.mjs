import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Resend } from 'resend';
export async function sendAccountMail({ user, url }, purpose) {
  const subject = purpose === 'reset' ? 'Reset your EnterpriseQR password' : 'Verify your EnterpriseQR email';
  const text = `${subject}\n\n${url}\n\nIf you did not request this, ignore this email.`;
  if (process.env.APP_MODE === 'local') {
    await mkdir('.data/mail', { recursive: true });
    await writeFile(`.data/mail/${randomUUID()}.json`, JSON.stringify({ to: user.email, subject, text, createdAt: new Date() }, null, 2), { mode: 0o600 });
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('Configure Resend email delivery before enabling accounts.');
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.MAIL_FROM, to: user.email, subject, text });
  if (error) throw new Error('Resend could not deliver account email.');
}
