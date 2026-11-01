import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { database } from './db.mjs';
import { sendAccountMail } from './mail.mjs';
export async function getAuth() {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.APP_URL) throw new Error('Authentication environment is missing.');
  const local = process.env.APP_MODE === 'local';
  if (local && !['127.0.0.1', 'localhost'].includes(new URL(process.env.APP_URL).hostname)) throw new Error('Local authentication is restricted to loopback addresses.');
  if (!local && (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.APP_URL.startsWith('https://'))) throw new Error('Production requires HTTPS and Resend email delivery.');
  {
    const { client, db } = await database();
    return betterAuth({
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.APP_URL,
      trustedOrigins: [process.env.APP_URL],
      database: mongodbAdapter(db, { client }),
      emailAndPassword: { enabled: true, minPasswordLength: 12, requireEmailVerification: !local, revokeSessionsOnPasswordReset: true, resetPasswordTokenExpiresIn: 1800, sendResetPassword: data => sendAccountMail(data, 'reset') },
      emailVerification: { sendOnSignUp: !local, sendOnSignIn: !local, sendVerificationEmail: data => sendAccountMail(data, 'verify') },
      session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60, cookieCache: { enabled: false } },
      rateLimit: { enabled: true, storage: 'database', window: 60, max: 60 },
    });
  }
}
