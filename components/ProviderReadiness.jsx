'use client';
import { useEffect, useState } from 'react';
export default function ProviderReadiness() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/operations/health', { cache: 'no-store' }).then(async response => { if (response.ok) setData(await response.json()); }).catch(() => {}); }, []);
  return <section className="panel account-card"><h2>VTPass connection</h2><p>{data ? data.provider.configured && data.provider.enabled ? 'Sandbox configured. Account-backed verification is still required before going live.' : 'Sandbox is not ready: add the sandbox API key and secret key in server configuration, then enable it.' : 'Checking connection configuration…'}</p><p>Real airtime remains disabled. Sandbox testing uses fictional destinations, not participant phone numbers.</p><p>{data && `${data.backlog} unfinished jobs · ${data.expiredLeases} expired leases · Worker ${data.workerRecentlySeen ? 'recently seen' : 'not recently seen'}`}</p>{data?.warnings.map(warning => <p className="notice" key={warning}>{warning}</p>)}<a href="https://sandbox.vtpass.com/" target="_blank" rel="noopener noreferrer">Open VTPass sandbox</a></section>;
}

