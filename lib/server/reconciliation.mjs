import { database } from './db.mjs';
import { AppError, admin, audit } from './access.mjs';
import { claimFilter } from './claims.mjs';
import { secretHash } from './reward-common.mjs';
export async function scheduleLookup(ctx, id, reason) {
  admin(ctx);
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw new AppError('Provide a reason for checking this transaction.');
  const { db, client } = await database();
  await client.withSession(session => session.withTransaction(async () => {
    const claim = await db.collection('rewardClaims').findOne(await claimFilter(ctx, id), { session });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (!['pending', 'unknown', 'succeeded'].includes(claim.status)) throw new AppError('Only pending, unknown or successful transactions can be checked. A failed payout cannot be resent here.', 409);
    const job = await db.collection('rewardJobs').findOne({ _id: id, organizationId: ctx.organization._id }, { session });
    if (!job || (job.status === 'leased' && job.leaseUntil > new Date())) throw new AppError('The worker is already checking this transaction.', 409);
    if (job.mode === 'vtpass-sandbox' && !job.providerRequestId) throw new AppError('No provider request exists to look up.', 409);
    if (job.lastManualLookupAt && Date.now() - job.lastManualLookupAt.getTime() < 60000) throw new AppError('Wait a minute before scheduling another lookup.', 429);
    await db.collection('rewardJobs').updateOne({ _id: id }, { $set: { status: 'ready', phase: 'reconcile', dueAt: new Date(), leaseUntil: new Date(0), lastManualLookupAt: new Date() }, $unset: { leaseToken: '' } }, { session });
    await db.collection('rewardEvents').insertOne({ claimId: id, organizationId: ctx.organization._id, campaignId: claim.campaignId, action: 'lookup_requested', reason: reason.trim(), actorId: ctx.user.id, createdAt: new Date() }, { session });
    await audit(ctx, 'reward.lookup.requested', id, session);
  })); return { scheduled: true };
}
export async function receiveVtpassHint(input) {
  const { db } = await database();
  // VTPass's published callback guide does not define a signing contract. Treat
  // callbacks as untrusted wake-up hints, never as settlement authorization.
  const requestId = input?.data?.requestId || input?.data?.request_id;
  if (typeof requestId !== 'string' || !/^\d{12}[a-zA-Z0-9]{1,84}$/.test(requestId)) return;
  const now = new Date(); const bucket = Math.floor(now.getTime() / 60000);
  await db.collection('callbackLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const count = await db.collection('callbackLimits').findOneAndUpdate({ _id: `vtpass:${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 120000) } }, { upsert: true, returnDocument: 'after' });
  if (count.count > 100) return;
  const job = await db.collection('rewardJobs').findOne({ providerRequestId: requestId, mode: 'vtpass-sandbox' }); if (!job) return;
  const id = secretHash(`vtpass-hint:${JSON.stringify(input)}`);
  try { await db.collection('providerHints').insertOne({ _id: id, organizationId: job.organizationId, campaignId: job.campaignId, claimId: job._id, createdAt: now }); } catch (error) { if (error.code === 11000) return; throw error; }
  await db.collection('rewardJobs').updateOne({ _id: job._id, status: { $ne: 'leased' }, $or: [{ lastHintAt: { $exists: false } }, { lastHintAt: { $lt: new Date(now.getTime() - 60000) } }] }, { $set: { status: 'ready', phase: 'reconcile', dueAt: now, lastHintAt: now } });
}
