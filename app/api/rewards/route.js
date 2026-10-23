import { context, failure, body, sameOrigin, admin, audit, AppError } from '@/lib/server/access.mjs';
import { reviewClaim } from '@/lib/server/claims.mjs';
import { processOne } from '@/lib/server/reward-worker.mjs';
import { reportScope, claimStateFilter } from '@/lib/server/analytics.mjs';
import { scheduleLookup } from '@/lib/server/reconciliation.mjs';
export async function GET(request) {
  try {
    const ctx = await context(request.headers); const page = Number(new URL(request.url).searchParams.get('page') || 1);
    if (!Number.isInteger(page) || page < 1 || page > 1000) throw new AppError('Invalid page.');
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const filter = claimStateFilter((await reportScope(ctx, query)).filter, query.status);
    const [claims, total] = await Promise.all([ctx.db.collection('rewardClaims').find(filter, { projection: { phoneHash: 0, participantHash: 0, fingerprint: 0, idempotencyKey: 0, referenceId: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).toArray(), ctx.db.collection('rewardClaims').countDocuments(filter)]);
    return Response.json({ claims, total, page }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    sameOrigin(request); const ctx = await context(request.headers); admin(ctx); const input = await body(request, 4000);
    if (input.action === 'process') { const result = await processOne({ organizationId: ctx.organization._id }); await audit(ctx, 'reward.simulator.run', result.claimId || ctx.organization._id); return Response.json(result); }
    if (typeof input.id !== 'string') throw new AppError('Choose a claim.');
    if (input.action === 'lookup') return Response.json(await scheduleLookup(ctx, input.id, input.reason));
    return Response.json(await reviewClaim(ctx, input.id, input));
  } catch (error) { return failure(error); }
}

