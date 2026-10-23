import Analytics from '@/components/Analytics';
import { headers } from "next/headers";
import { context, campaignFilter } from "@/lib/server/access.mjs";
import { Button, PageHeading } from "@/components/ui";
export default async function Dashboard() {
  const ctx = await context(await headers());
  const filter = campaignFilter(ctx);
  const counts = await Promise.all(
    ["Draft", "Published", "Paused", "Archived"].map((status) =>
      ctx.db.collection("campaigns").countDocuments({ ...filter, status }),
    ),
  );
  const campaigns = await ctx.db.collection('campaigns').find(filter, { projection: { 'draft.name': 1 } }).sort({ updatedAt: -1 }).limit(500).toArray();
  return (
    <>
      <PageHeading
        eyebrow='YOUR WORKSPACE'
        title={"Welcome to " + ctx.organization.name}
        description='Create a page, publish your story and share its QR code.'
      >
        <Button href='/dashboard/campaigns/new'>Create campaign</Button>
      </PageHeading>
      <div className='phase-metrics'>
        {["Draft", "Published", "Paused", "Archived"].map((status, i) => (
          <section className='panel account-card' key={status}>
            <h2>{counts[i]}</h2>
            <p>{status} campaigns</p>
          </section>
        ))}
      </div>
      <Analytics compact campaigns={campaigns.map(c => ({ id: c._id, name: c.draft.name }))} />
      <section className='panel account-card'>
        <h2>Build your next connection.</h2>
        <p>
          Customize banners, profile photos, stories, event invitations and
          links. Save privately, then publish when ready.
        </p>
        <Button href='/dashboard/campaigns' variant='secondary'>
          View campaigns
        </Button>
        <p className='notice'>
          Forms and test rewards are available. Real airtime is not connected. Published
          counts include scheduled pages.
        </p>
      </section>
    </>
  );
}

