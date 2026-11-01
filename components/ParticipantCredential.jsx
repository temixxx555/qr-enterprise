'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';

export default function ParticipantCredential() {
  const [payload, setPayload] = useState(null);
  useEffect(() => { let active = true; async function load() { const value = new URLSearchParams(location.hash.slice(1)).get('credential') || ''; if (!value) return; const data = await QRCode.toDataURL(`${location.origin}/participant#credential=${value}`, { width: 320, margin: 2 }); if (active) setPayload({ credential: value, qr: data }); } load().catch(() => {}); return () => { active = false; }; }, []);
  return <main className="feeding-public"><section className="panel account-card participant-credential"><p className="eyebrow">PRIVATE PARTICIPANT QR</p><h1>Your collection code</h1>{payload ? <><p>Keep this code private. Show it only to authorized distribution staff. A code can be copied; contact the program if your phone or QR is lost so it can be revoked and reissued.</p><Image src={payload.qr} width={320} height={320} alt="Private participant QR code" unoptimized /><p className="muted">This QR contains an opaque credential and no personal details.</p></> : <><p>No participant credential is present on this device, or it is still loading. Request a secure recovery or reissue from your program administrator.</p><p>Do not send your code or PIN by ordinary email.</p></>}</section></main>;
}
