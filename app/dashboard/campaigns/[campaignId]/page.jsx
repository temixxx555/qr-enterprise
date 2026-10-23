import RewardSettings from '@/components/RewardSettings';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { campaignFilter } from '@/lib/server/access.mjs';
import { pageContext as context } from '@/lib/server/page-context';
import CampaignControls from '@/components/CampaignControls';
import PageRenderer from '@/components/PageRenderer';
export default async function Detail({ params }) { const ctx = await context(await headers()); const record = await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, (await params).campaignId)); if (!record) notFound(); return <><CampaignControls initial={JSON.parse(JSON.stringify(record))} appUrl={process.env.APP_URL} canPublish={ctx.membership.role !== 'manager'} /><RewardSettings campaignId={record._id} canEdit={ctx.membership.role !== 'manager'} /><h2>Saved draft preview</h2><PageRenderer page={record.draft} /></>; }

