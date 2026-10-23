'use client';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
export default function SessionSettings() { const [message, setMessage] = useState(''); return <section className="panel account-card"><h1>Account security</h1><p>End your other signed-in sessions. Your current session stays active.</p><Button onClick={async () => { try { const result = await authClient.revokeOtherSessions(); setMessage(result.error ? result.error.message : 'Other sessions have been signed out.'); } catch { setMessage('Could not revoke sessions. Please try again.'); } }}>Sign out other devices</Button>{message && <p role="status">{message}</p>}<p><a href="/reset-password">Reset password</a></p></section>; }
