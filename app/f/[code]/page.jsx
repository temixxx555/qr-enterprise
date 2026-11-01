import { notFound } from 'next/navigation';
import { publicProgram } from '@/lib/server/feeding.mjs';
import FeedingApplication from '@/components/FeedingApplication';

export const dynamic = 'force-dynamic';
export default async function PublicFeedingProgramPage({ params }) {
  const { code } = await params; const program = await publicProgram(code); if (!program) notFound();
  return <main className="feeding-public"><div className="feeding-public-inner"><p className="eyebrow">COMMUNITY FOOD PROGRAM</p><h1>{program.name}</h1><p className="feeding-description">{program.description}</p><section className="panel account-card"><h2>Program information</h2><p><strong>Eligibility:</strong> {program.eligibility}</p><p><strong>Service period:</strong> {program.startsAt ? new Date(program.startsAt).toLocaleDateString('en-GB') : 'Contact program'}{program.endsAt ? ` – ${new Date(program.endsAt).toLocaleDateString('en-GB')}` : ''} · {program.timezone}</p><h2>Locations</h2>{program.locations.map(location => <p key={location.id}><strong>{location.name}</strong><br />{location.address} {location.instructions}</p>)}<h2>Serving sessions</h2>{program.sessions.map(session => <p key={session.id}><strong>{session.name}</strong> · {session.start}–{session.end} · {session.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}</p>)}<p><strong>Contact:</strong> {program.contact || 'Contact information not provided.'}</p><h2>Privacy information</h2><p className="form-privacy">{program.privacyNotice}</p></section><FeedingApplication program={program} /><p className="feeding-security-note">This public QR opens an application only. It does not grant food or record a serving. Approved participants receive a separate private participant QR.</p></div></main>;
}
