import Link from 'next/link';
import { headers } from 'next/headers';
import { pageContext } from '@/lib/server/page-context';
import { admin } from '@/lib/server/access.mjs';
import { Button, PageHeading } from '@/components/ui';

export default async function FeedingProgramsPage() {
  const ctx = await pageContext(await headers()); admin(ctx);
  const records = await ctx.db.collection('feedingPrograms').find({ organizationId: ctx.organization._id }, { projection: { name: 1, status: 1, revision: 1, publicCode: 1, updatedAt: 1, enrolledCount: 1 } }).sort({ updatedAt: -1 }).limit(200).toArray();
  return <><PageHeading eyebrow="FOOD DISTRIBUTION" title="Feeding Programs" description="Manage applications, household enrollment, serving schedules, and participant QR redemptions."><Button href="/dashboard/feeding-programs/new">Create Feeding Program</Button></PageHeading><div className="notice">Public program QR codes open applications only. Approved participants receive a separate private QR for staff-confirmed collection.</div><section className="panel account-card">{records.length ? records.map(program => <div className="organization-row" key={program._id}><span><Link href={`/dashboard/feeding-programs/${program._id}`}><strong>{program.name}</strong></Link><small>{program.status} · {program.enrolledCount || 0} enrolled · Updated {new Date(program.updatedAt).toLocaleDateString('en-GB')}</small></span><Button variant="secondary" href={`/dashboard/feeding-programs/${program._id}`}>Manage</Button></div>) : <p>No Feeding Programs yet. Create a draft to configure your first program.</p>}</section></>;
}
