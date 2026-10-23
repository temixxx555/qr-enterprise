import { context, failure, AppError } from '@/lib/server/access.mjs';
import { claimFilter } from '@/lib/server/claims.mjs';
export async function GET(request, { params }) {
  try {
    const ctx = await context(request.headers); const { id } = await params;
    const claim = await ctx.db.collection('rewardClaims').findOne(await claimFilter(ctx, id), { projection: { phoneHash: 0, participantHash: 0, fingerprint: 0, idempotencyKey: 0, referenceId: 0 } });
    if (!claim) throw new AppError('Claim not found.', 404);
    const [job, ledger, events] = await Promise.all([
      ctx.db.collection('rewardJobs').findOne({ _id: id, organizationId: ctx.organization._id }, { projection: { status: 1, phase: 1, attempts: 1, dueAt: 1, leaseUntil: 1, providerRequestId: 1, lastOutcome: 1 } }),
      ctx.db.collection('rewardLedger').find({ claimId: id, organizationId: ctx.organization._id }).sort({ createdAt: 1 }).toArray(),
      ctx.db.collection('rewardEvents').find({ claimId: id, organizationId: ctx.organization._id }).sort({ createdAt: -1 }).limit(50).toArray(),
    ]);
    return Response.json({ claim, job, ledger, events }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
