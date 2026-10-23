'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui';
import PageRenderer from '@/components/PageRenderer';
import { normalizePage } from '@/lib/campaign-page.mjs';

export default function Participant({ campaign, localDraft = false }) {
  const page = normalizePage(campaign);
  const [action, setAction] = useState(null);
  const [finished, setFinished] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => { if (action) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [action]);
  function close() { setAction(null); setFinished(false); }
  return <main className="personal-page-shell"><div className="personal-page-toolbar"><Link href="/dashboard/campaigns"><ArrowLeft size={15} />Campaigns</Link><span>{localDraft ? 'Local draft · Only in this browser' : 'Participant demo'}</span>{localDraft && <Link href={`/dashboard/campaigns/drafts/${campaign.id}/edit`}><Pencil size={14} />Edit page</Link>}</div><PageRenderer page={page} onAction={setAction} />
    <dialog ref={dialogRef} className="participant-dialog" onCancel={close} onClose={close}><button type="button" className="dialog-close icon-button" aria-label="Close participant action" onClick={close}><X size={20} /></button>{finished ? <div className="participant-success"><CheckCircle2 size={45} /><h1>{action === 'rsvp' ? 'That’s the RSVP experience.' : 'That’s the experience.'}</h1><p>{action === 'reward' ? 'In the live app, phone verification and server eligibility checks come next. This demo has not sent airtime or created a claim.' : action === 'rsvp' ? 'This demo has not registered you for an event or stored your details.' : 'Your demo message was not stored or sent.'}</p><Button variant="secondary" onClick={close}>Back to page</Button></div> : <form className="participant-form" onSubmit={e => { e.preventDefault(); setFinished(true); }}><h2>{action === 'reward' ? 'A little something for you.' : action === 'rsvp' ? 'Will you be joining us?' : 'Leave a message.'}</h2><p className="field-help">Use fictional details. This preview does not submit or save your information.</p><label>Your name<input name="name" autoComplete="off" required maxLength={100} placeholder="e.g. Demo Guest" /></label>{action === 'reward' ? <label>Phone number<input name="phone" type="tel" autoComplete="off" required pattern="[+0-9 ()-]{10,20}" placeholder="Use a fictional number" /></label> : action === 'rsvp' ? <><label>Will you attend?<select name="attendance" defaultValue="" required><option value="" disabled>Choose a response</option><option>Yes, I’ll be there</option><option>Maybe</option><option>I can’t make it</option></select></label><label>Number of guests<input type="number" min="1" max="20" defaultValue="1" required /></label></> : <label>Your message<textarea name="feedback" required maxLength={1000} rows={4} placeholder="What would you like to share?" /></label>}<label className="checkbox-label"><input type="checkbox" required />I understand this is a demo and no reward or registration will be issued.</label><Button type="submit">Continue demo<ArrowRight size={17} /></Button></form>}</dialog>
  </main>;
}
