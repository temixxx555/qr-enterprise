import { headers } from 'next/headers';
import { pageContext } from '@/lib/server/page-context';
import { campaignFilter } from '@/lib/server/access.mjs';
import SubmissionInbox from '@/components/SubmissionInbox';
export default async function Submissions() { const ctx = await pageContext(await headers()); const campaigns = await ctx.db.collection('campaigns').find(campaignFilter(ctx), { projection: { 'draft.name': 1 } }).sort({ updatedAt: -1 }).limit(500).toArray(); return <SubmissionInbox campaigns={campaigns.map(c => ({ id: c._id, name: c.draft.name }))} />; }
