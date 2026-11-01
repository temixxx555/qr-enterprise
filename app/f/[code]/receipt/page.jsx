'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function FeedingReceiptPage() {
  const { code } = useParams(); const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { const token = new URLSearchParams(location.hash.slice(1)).get('token') || ''; fetch(`/api/public/feeding/${code}/receipt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); }).catch(e => setError(e.message)); }, [code]);
  return <main className="feeding-public"><section className="panel account-card"><p className="eyebrow">PRIVATE APPLICATION RECEIPT</p><h1>Application status</h1>{error ? <p className="field-error">{error}</p> : data ? <><p>{data.programName}</p><p>Applicant: {data.applicant} · Household of {data.householdSize}</p><p className="feeding-status">{data.status.replaceAll('_', ' ')}</p>{data.participantMessage && <p>{data.participantMessage}</p>}{data.history?.map((item, i) => <p key={i}>{item.status.replaceAll('_', ' ')}{item.message ? ` — ${item.message}` : ''}</p>)}</> : <p>Loading status…</p>}</section></main>;
}
