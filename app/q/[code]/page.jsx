import { notFound } from 'next/navigation';
import { database } from '@/lib/server/db.mjs';
import { available } from '@/lib/server/campaigns.mjs';
import PublicPage from '@/components/PublicPage';
export const dynamic = 'force-dynamic';
export default async function CampaignPage({ params }) { const { db } = await database(); const record = await db.collection('campaigns').findOne({ code: (await params).code }); if (!record) notFound(); const organization = await db.collection('organizations').findOne({ _id: record.organizationId, status: 'active' }); if (!organization || !available(record)) return <main className="account-shell"><section className="panel account-card"><h1>This page is currently unavailable.</h1><p>It may be a draft, paused, scheduled for later or closed.</p></section></main>; return <PublicPage page={record.published} campaignCode={record.code} publicationRevision={record.publishedRevision} />; }
