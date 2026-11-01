'use client';
import { useState } from 'react';

export default function FeedingApplications({ programId, applications }) {
  const [items, setItems] = useState(applications); const [message, setMessage] = useState(''); const [busy, setBusy] = useState('');
  async function decide(app, status) {
    const reason = status === 'approved' ? 'Approved after program review.' : window.prompt('Enter a respectful decision reason:');
    if (!reason) return;
    setBusy(app._id); setMessage('');
    try {
      const response = await fetch(`/api/feeding-programs/${programId}/applications`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app._id, status, reason }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Decision could not be saved.');
      setItems(current => current.map(item => item._id === app._id ? { ...item, status } : item));
      setMessage(result.credential ? `Approved. Deliver this new private participant QR securely: ${result.credential.url}` : `Application updated: ${status.replaceAll('_', ' ')}.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(''); }
  }
  async function reissue(app) { const reason = window.prompt('Why is this participant QR being replaced?'); if (!reason) return; setBusy(app._id); setMessage(''); try { const r = await fetch(`/api/feeding-programs/${programId}/applications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app._id, reason }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessage(`Old participant QR revoked. Deliver the replacement securely: ${d.url}`); } catch (e) { setMessage(e.message); } finally { setBusy(''); } }
  return <><section className="panel account-card"><h2>Applications</h2>{message && <p className="notice" role="status">{message}</p>}{items.length ? items.map(app => <article className="feeding-application-row" key={app._id}><div><strong>{app.applicant.name}</strong><small>{app.status.replaceAll('_', ' ')} · Household of {app.household.size} · {new Date(app.createdAt).toLocaleDateString('en-GB')}</small><small>Phone: {app.applicant.phone}</small></div><div className="feeding-actions">{app.status === 'approved' && <button className="button button-secondary" disabled={!!busy} onClick={() => reissue(app)}>Reissue private QR</button>}<button className="button button-primary" disabled={!!busy || app.status === 'approved'} onClick={() => decide(app, 'approved')}>Approve</button><button className="button button-secondary" disabled={!!busy} onClick={() => decide(app, 'needs_information')}>Request info</button><button className="button button-secondary" disabled={!!busy} onClick={() => decide(app, 'waitlisted')}>Waitlist</button><button className="button button-secondary" disabled={!!busy} onClick={() => decide(app, 'rejected')}>Reject</button></div></article>) : <p>No applications received yet.</p>}</section></>;
}
