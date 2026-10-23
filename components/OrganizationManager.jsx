'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from './ui';
export default function OrganizationManager() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/organizations').then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setOrganizations(data); }).catch(e => setError(e.message)); }, []);
  async function send(input) { setBusy(true); setError(''); try { const response = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.replace('/dashboard'); router.refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <section className="panel account-card"><h1>Your organizations</h1><p>Each organization has its own pages and team permissions.</p>{organizations.map(org => <div className="organization-row" key={org._id}><span><strong>{org.name}</strong><small>{org.role}</small></span><Button disabled={busy} variant="secondary" onClick={() => send({ select: org._id })}>Open workspace</Button></div>)}<form className="participant-form" onSubmit={e => { e.preventDefault(); send({ name: new FormData(e.currentTarget).get('name') }); }}><label>New organization name<input name="name" required maxLength={100} /></label><Button disabled={busy}>Create organization</Button></form>{error && <p role="alert">{error}</p>}</section>;
}
