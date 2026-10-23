import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { campaignFilter } from '@/lib/server/access.mjs';
import { pageContext as context } from '@/lib/server/page-context';
import CampaignWizard from '@/components/CampaignWizard';
export default async function Edit({ params }) { const ctx = await context(await headers()); const record = await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, (await params).campaignId)); if (!record) notFound(); return <CampaignWizard key={record._id} initialPage={{ ...record.draft, id: record._id }} serverRevision={record.revision} />; }
