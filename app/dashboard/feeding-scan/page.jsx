import { headers } from 'next/headers';
import { pageContext } from '@/lib/server/page-context';
import FeedingScanner from '@/components/FeedingScanner';
import { admin } from '@/lib/server/access.mjs';

export default async function FeedingScanPage() {
  const ctx = await pageContext(await headers()); admin(ctx);
  const programs = await ctx.db.collection('feedingPrograms').find({ organizationId: ctx.organization._id, status: 'Published' }, { projection: { name: 1, locations: 1, sessions: 1, limits: 1 } }).sort({ name: 1 }).limit(100).toArray();
  return <FeedingScanner programs={JSON.parse(JSON.stringify(programs))} />;
}
