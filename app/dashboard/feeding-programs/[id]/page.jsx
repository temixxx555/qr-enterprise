import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { pageContext } from '@/lib/server/page-context';
import FeedingProgramEditor from '@/components/FeedingProgramEditor';
import FeedingApplications from '@/components/FeedingApplications';
import { admin } from '@/lib/server/access.mjs';
import { Button } from '@/components/ui';

export default async function FeedingProgramPage({ params }) {
  const { id } = await params; const ctx = await pageContext(await headers()); admin(ctx);
  const program = await ctx.db.collection('feedingPrograms').findOne({ _id: id, organizationId: ctx.organization._id }); if (!program) notFound();
  const apps = await ctx.db.collection('feedingApplications').find({ programId: id, organizationId: ctx.organization._id }, { projection: { applicant: 1, household: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray();
  return <><FeedingProgramEditor program={JSON.parse(JSON.stringify(program))} /><FeedingApplications programId={id} applications={JSON.parse(JSON.stringify(apps))} /><div className="button-row"><Button variant="secondary" href="/dashboard/feeding-programs">Back to programs</Button></div></>;
}
