import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { pageContext } from '@/lib/server/page-context';
import { submissionFilter } from '@/lib/server/submissions.mjs';
import SubmissionDetail from '@/components/SubmissionDetail';
export default async function Submission({ params }) { const ctx = await pageContext(await headers()); const record = await ctx.db.collection('submissions').findOne(await submissionFilter(ctx, (await params).id), { projection: { payloadHash: 0, idempotencyKey: 0 } }); if (!record) notFound(); return <SubmissionDetail initial={JSON.parse(JSON.stringify(record))} />; }
