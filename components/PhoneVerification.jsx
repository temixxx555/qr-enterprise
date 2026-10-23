'use client';
import { useState } from 'react';
import { Button } from './ui';
import RewardClaimForm from './RewardClaimForm';
export default function PhoneVerification({ campaignCode, publicationRevision }) {
  const [phone, setPhone] = useState(''); const [otp, setOtp] = useState(''); const [consent, setConsent] = useState(false);
  const [challenge, setChallenge] = useState(null); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`/api/public/campaigns/${campaignCode}/verification`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: challenge ? 'confirm' : 'request', phone, otp, consent, publicationRevision, botToken: new FormData(event.currentTarget).get('botCheck') ? 'local-test' : '' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (data.verified) setResult(data); else setChallenge(data);
    } catch (failure) { setError(failure.message || 'Unable to verify. Please try again.'); } finally { setBusy(false); }
  }
  if (result) return <RewardClaimForm campaignCode={campaignCode} publicationRevision={publicationRevision} phone={phone} />;
  return <form className="dynamic-form" onSubmit={submit}><h2>Phone verification</h2><p className="notice">Test flow · No SMS or airtime is sent. Verification uses a local simulator.</p>{result ? <p role="status">{result.message}</p> : <><fieldset disabled={busy}><div className="dynamic-field"><label htmlFor="reward-phone">Nigerian mobile number</label><input id="reward-phone" type="tel" autoComplete="tel" required value={phone} onChange={event => { setPhone(event.target.value); setChallenge(null); setOtp(''); }} placeholder="08012345678" /></div><label className="checkbox-label"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} />I agree to use my phone number for verification. This does not subscribe me to marketing.</label><label className="checkbox-label"><input type="checkbox" name="botCheck" />Complete local test bot check (required after repeated requests)</label>{challenge && <><p role="status" className="notice">{challenge.message} Test code: <strong>{challenge.simulatedCode}</strong></p><div className="dynamic-field"><label htmlFor="reward-otp">Six-digit code</label><input id="reward-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={event => setOtp(event.target.value)} /></div><button type="button" onClick={() => { setChallenge(null); setOtp(''); }}>Request another code</button></>}</fieldset>{error && <p role="alert" className="field-error">{error}</p>}<Button disabled={busy}>{busy ? 'Please wait…' : challenge ? 'Verify code' : 'Get test code'}</Button></>}</form>;
}

