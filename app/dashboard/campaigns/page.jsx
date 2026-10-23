import Link from 'next/link';
import { headers } from 'next/headers';
import { campaignFilter } from '@/lib/server/access.mjs';
import { pageContext as context } from '@/lib/server/page-context';
import { Button, PageHeading } from '@/components/ui';
import LocalDrafts from '@/components/LocalDrafts';
export default async function Campaigns() { const ctx = await context(await headers()); const records = await ctx.db.collection('campaigns').find(campaignFilter(ctx), { projection: { 'draft.name': 1, status: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(200).toArray(); return <><PageHeading eyebrow="CREATE CONNECTIONS" title="Your campaigns" description="Saved pages for this organization."><Button href="/dashboard/campaigns/new">Create campaign</Button></PageHeading><section className="panel account-card">{records.length ? records.map(record => <div className="organization-row" key={record._id}><span><Link href={'/dashboard/campaigns/' + record._id}><strong>{record.draft.name}</strong></Link><small>{record.status} · {record.updatedAt.toLocaleDateString('en-GB')}</small></span><Button variant="secondary" href={'/dashboard/campaigns/' + record._id + '/edit'}>Edit page</Button></div>) : <p>No campaigns yet. Create your first page above.</p>}</section><LocalDrafts /></>; }
