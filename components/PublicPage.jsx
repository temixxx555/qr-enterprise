'use client';
import { useEffect, useRef, useState } from 'react';
import PageRenderer from './PageRenderer';
import DynamicForm from './DynamicForm';
import PhoneVerification from './PhoneVerification';
export default function PublicPage({ page, campaignCode, publicationRevision }) {
  const [action, setAction] = useState(null); const [message, setMessage] = useState(''); const dialog = useRef(null); const eventId = useRef(null); const [visitId, setVisitId] = useState(null);
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close(); }, [action]);
  useEffect(() => { if (eventId.current?.code === campaignCode) return; const id = crypto.randomUUID(); eventId.current = { code: campaignCode, id }; fetch(`/api/public/campaigns/${campaignCode}/visits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: id }) }).then(response => { if (response.ok) setVisitId(id); }).catch(() => {}); }, [campaignCode]);
  function open(value) { if (value !== 'reward' && !page.forms?.[value]) { setMessage('The organizer has not opened this form yet. Please use their contact links.'); return; } setMessage(''); setAction(value); }
  return <main className="personal-page-shell"><PageRenderer page={page} published onAction={open}>{message && <p role="status" className="notice">{message}</p>}</PageRenderer><dialog ref={dialog} className="participant-dialog response-dialog" onCancel={() => setAction(null)} onClose={() => setAction(null)} aria-label={action === 'reward' ? 'Phone verification' : action ? page.forms[action]?.title : 'Response form'}><button className="dialog-close icon-button" aria-label="Close response form" onClick={() => setAction(null)}>×</button>{action === 'reward' ? <PhoneVerification campaignCode={campaignCode} publicationRevision={publicationRevision} /> : action && <DynamicForm key={action} visitId={visitId} form={page.forms[action]} campaignCode={campaignCode} action={action} publicationRevision={publicationRevision} />}</dialog></main>;
}



