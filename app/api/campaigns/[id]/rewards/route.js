import { context, campaignFilter, body, failure, sameOrigin, AppError } from '@/lib/server/access.mjs';
import { saveRewardPolicy } from '@/lib/server/reward-policy.mjs';
export async function GET(request, { params }) {
  try {
    const ctx = await context(request.headers); const { id } = await params;
    if (!(await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, id)))) throw new AppError('Campaign not found.', 404);
    const policy = await ctx.db.collection('rewardPolicies').findOne({ _id: id, organizationId: ctx.organization._id });
    const references = await ctx.db.collection('rewardReferences').countDocuments({ campaignId: id, usedBy: null });
    const ledger = await ctx.db.collection('rewardLedger').find({ campaignId: id, organizationId: ctx.organization._id }, { projection: { kind: 1, amountMinor: 1, claimId: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(20).toArray();
    return Response.json({ policy, unusedReferences: references, ledger }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function PUT(request, { params }) {
  try { sameOrigin(request); return Response.json(await saveRewardPolicy(await context(request.headers), (await params).id, await body(request, 60000))); }
  catch (error) { return failure(error); }
}
