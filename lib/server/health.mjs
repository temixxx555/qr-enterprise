import { campaignFilter } from './access.mjs';
import { vtpassReadiness } from './vtpass.mjs';
export async function operationsHealth(ctx) {
  const ids = await ctx.db.collection('campaigns').distinct('_id', campaignFilter(ctx));
  const filter = { organizationId: ctx.organization._id, campaignId: { $in: ids } }; const now = new Date();
  const [backlog, staleJobs, expiredLeases, unknown, heartbeat] = await Promise.all([
    ctx.db.collection('rewardJobs').countDocuments({ ...filter, status: { $ne: 'done' } }),
    ctx.db.collection('rewardJobs').countDocuments({ ...filter, status: { $ne: 'done' }, dueAt: { $lt: new Date(now.getTime() - 600000) } }),
    ctx.db.collection('rewardJobs').countDocuments({ ...filter, status: 'leased', leaseUntil: { $lt: now } }),
    ctx.db.collection('rewardClaims').countDocuments({ ...filter, status: 'unknown' }),
    ctx.db.collection('workerHeartbeats').findOne({}, { sort: { lastSeenAt: -1 }, projection: { lastSeenAt: 1 } }),
  ]);
  return { checkedAt: now, backlog, staleJobs, expiredLeases, unknown, workerRecentlySeen: !!heartbeat && now - heartbeat.lastSeenAt < 90000, provider: vtpassReadiness(), warnings: [...(staleJobs ? ['Queued jobs have waited more than ten minutes. Check the worker.'] : []), ...(unknown ? ['Unknown provider outcomes retain their budget. Reconcile the existing transactions.'] : []), ...(backlog && (!heartbeat || now - heartbeat.lastSeenAt > 90000) ? ['No recent independent-worker heartbeat. Start or inspect the worker.'] : [])] };
}
