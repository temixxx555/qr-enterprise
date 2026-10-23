import { campaignFilter } from '@/lib/server/access.mjs';
import { headers } from 'next/headers';
import { pageContext } from '@/lib/server/page-context';
import Fulfillment from '@/components/Fulfillment';
export default async function FulfillmentPage() { const ctx = await pageContext(await headers()); const records = await ctx.db.collection('campaigns').find(campaignFilter(ctx), { projection: { 'draft.name': 1 } }).sort({ updatedAt: -1 }).limit(500).toArray(); return <Fulfillment campaigns={records.map(c => ({ id: c._id, name: c.draft.name }))} canReview={ctx.membership.role !== 'manager'} />; }

