'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';

export default function FeedingScanner({ programs }) {
  const [programId, setProgramId] = useState(programs[0]?._id || '');
  const [locationId, setLocationId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [credential, setCredential] = useState('');
  const [recipientId, setRecipientId] = useState('household');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const redemptionKey = useRef('');
  const video = useRef(null);
  const stream = useRef(null);
  const program = programs.find(p => p._id === programId);

  useEffect(() => () => stream.current?.getTracks().forEach(track => track.stop()), []);

  function credentialFrom(value) {
    try { const parsed = new URL(value); return new URLSearchParams(parsed.hash.slice(1)).get('credential') || value; }
    catch { return value.trim(); }
  }

  async function startCamera() {
    setError('');
    try {
      if (!globalThis.BarcodeDetector) throw new Error('QR camera scanning is not supported by this browser. Enter the QR contents manually.');
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      setCamera(true);
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (video.current) { video.current.srcObject = stream.current; await video.current.play(); }
      const detector = new globalThis.BarcodeDetector({ formats: ['qr_code'] });
      const detect = async () => {
        if (!stream.current || !video.current) return;
        try {
          const found = await detector.detect(video.current);
          if (found[0]) { setCredential(found[0].rawValue); setResult(null); stream.current.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); return; }
        } catch { /* Continue scanning; manual entry remains available. */ }
        requestAnimationFrame(detect);
      };
      requestAnimationFrame(detect);
    } catch (e) {
      stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false);
      setError(e.message || 'Camera access failed. Enter the QR contents manually.');
    }
  }

  async function check() {
    setError(''); setResult(null); setBusy(true);
    const recipient = program?.limits?.unit === 'household' ? 'household' : recipientId || undefined;
    try {
      const response = await fetch('/api/feeding/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId, credential: credentialFrom(credential), locationId, sessionId, recipientId: recipient }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Cannot verify participant.'); setResult({ ...data, recipientId: recipient || '' });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function redeem() {
    setBusy(true); setError('');
    try {
      redemptionKey.current ||= crypto.randomUUID();
      const response = await fetch('/api/feeding/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId, credential: credentialFrom(credential), locationId, sessionId, recipientId, idempotencyKey: redemptionKey.current }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Redemption was not recorded.'); setResult({ ...result, redeemed: true, redemptionId: data.redemptionId });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <section className="panel account-card">
    <p className="eyebrow">AUTHORIZED STAFF</p><h1>Confirm food collection</h1>
    <p>Select the program, location, and session before checking the participant credential.</p>
    <label>Feeding Program<select value={programId} onChange={e => { setProgramId(e.target.value); setResult(null); }}><option value="">Select program</option>{programs.map(p => <option value={p._id} key={p._id}>{p.name}</option>)}</select></label>
    <label>Distribution location<select value={locationId} onChange={e => setLocationId(e.target.value)}><option value="">Select location</option>{(program?.locations || []).filter(x => x.active).map(x => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
    <label>Serving session<select value={sessionId} onChange={e => setSessionId(e.target.value)}><option value="">Select session</option>{(program?.sessions || []).filter(x => x.active).map(x => <option value={x.id} key={x.id}>{x.name} ({x.start}–{x.end})</option>)}</select></label>
    <Button variant="secondary" disabled={!programId || !locationId || !sessionId} onClick={startCamera}>Scan with camera</Button>
    {camera && <video ref={video} className="feeding-camera" muted playsInline aria-label="Camera QR scanner" />}
    <label>Or enter private participant QR<input autoComplete="off" value={credential} onChange={e => { setCredential(e.target.value); setResult(null); redemptionKey.current = ''; }} placeholder="Paste QR contents" /></label>
    <p className="field-help">Camera requires HTTPS (or localhost) and browser permission. GET/page loads never create a redemption.</p>
    <Button disabled={busy || !programId || !locationId || !sessionId || !credential} onClick={check}>{busy ? 'Checking…' : 'Check eligibility'}</Button>
    {error && <p className="field-error" role="alert">{error}</p>}
    {result && <section className="feeding-scan-result"><h2>Eligibility check</h2><p>{result.participant?.name} · Household of {result.participant?.householdSize}</p><p>{result.program?.name} · {result.site} · {result.session}</p>
      {program?.limits?.unit !== 'household' && <><label>Recipient<select value={recipientId} onChange={e => setRecipientId(e.target.value)}><option value="">Select household member</option>{result.participant?.recipients?.filter(x => program?.limits?.unit !== 'child' || x.isChild).map(x => <option value={x.id} key={x.id}>{x.name}{x.isChild ? ' (child)' : ''}</option>)}</select></label>{recipientId && result.recipientId !== recipientId && <Button variant="secondary" disabled={busy} onClick={check}>Check selected recipient</Button>}</>}
      {result.allowanceAvailable && (program?.limits?.unit === 'household' || result.recipientId === recipientId) ? <><p>Eligibility was checked against the current schedule and allowance. Confirm only after food is handed over.</p><Button disabled={busy} onClick={redeem}>Confirm food handover</Button></> : result.allowanceAvailable ? <p>Select a recipient and check their allowance before handover.</p> : <p>Allowance is already used for this period.</p>}
    </section>}
  </section>;
}
