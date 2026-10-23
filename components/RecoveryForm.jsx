'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
export default function RecoveryForm({ token }) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); try { const data = new FormData(e.currentTarget); const result = token ? await authClient.resetPassword({ token, newPassword: data.get('password') }) : await authClient.requestPasswordReset({ email: data.get('email'), redirectTo: '/reset-password' }); if (result.error) throw new Error(result.error.message); setMessage(token ? 'Password changed. Sign in with your new password.' : 'If this account exists, a recovery link has been sent. In local mode, it is saved in the private development mail folder.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  return <main className="account-shell"><form className="panel account-card participant-form" onSubmit={submit}><h1>{token ? 'Choose a new password' : 'Reset your password'}</h1>{token ? <label>New password<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label> : <label>Account email<input name="email" type="email" required autoComplete="email" /></label>}<Button disabled={busy}>{busy ? 'Please wait…' : token ? 'Save new password' : 'Request recovery link'}</Button>{message && <p role="status">{message}</p>}<Link href="/login">Back to sign in</Link></form></main>;
}
