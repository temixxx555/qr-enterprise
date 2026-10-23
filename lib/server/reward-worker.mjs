import { vtpassJobOutcome } from './vtpass.mjs';
import { randomUUID } from 'node:crypto';
import { database } from './db.mjs';
import { ledger, releaseReservation } from './claims.mjs';
import { requireSimulator, rewardIndexes } from './reward-common.mjs';

// This adapter deliberately has no network transport. Its unique transaction key models
// the idempotency/lookup contract required of a future real provider adapter.
export async function simulatorOutcome(db, claim, phase) {
  const initial = { success: 'succeeded', failure: 'failed', pending: 'pending', timeout: 'unknown', reversal: 'succeeded' }[claim.scenario];
  const transaction = { _id: claim._id, organizationId: claim.organizationId, scenario: claim.scenario, initial, amountMinor: claim.amountMinor, createdAt: new Date(), providerReference: `sim-${claim._id}` };
  try { await db.collection('simulatorTransactions').updateOne({ _id: claim._id }, { $setOnInsert: transaction }, { upsert: true }); } catch (error) { if (error.code !== 11000) throw error; }
  const original = await db.collection('simulatorTransactions').findOne({ _id: claim._id });
  return { status: phase === 'reconcile' ? original.scenario === 'reversal' ? 'reversed' : original.scenario === 'failure' ? 'failed' : 'succeeded' : original.initial, reference: original.providerReference };
}
export async function leaseJob({ organizationId, now = new Date(), leaseMs = 30000 } = {}) {
  requireSimulator(); const { db } = await database(); await rewardIndexes(db);
  return db.collection('rewardJobs').findOneAndUpdate({ mode: { $in: ['simulator', 'vtpass-sandbox'] }, ...(organizationId ? { organizationId } : {}), $or: [{ status: 'ready', dueAt: { $lte: now } }, { status: 'leased', leaseUntil: { $lte: now } }] }, { $set: { status: 'leased', leaseToken: randomUUID(), leaseUntil: new Date(now.getTime() + leaseMs) }, $inc: { attempts: 1 } }, { sort: { dueAt: 1 }, returnDocument: 'after' });
}
export async function finishJob(job, outcome) {
  requireSimulator(); const { db, client } = await database(); let settled = false;
  await client.withSession(session => session.withTransaction(async () => {
    const currentJob = await db.collection('rewardJobs').findOne({ _id: job._id, status: 'leased', leaseToken: job.leaseToken, leaseUntil: { $gt: new Date() } }, { session });
    if (!currentJob) return; // A reclaimed lease fences off the old worker.
    const claim = await db.collection('rewardClaims').findOne({ _id: job._id, mode: { $in: ['simulator', 'vtpass-sandbox'] } }, { session });
    if (!claim) throw new Error('Job has no simulator claim.');
    const reserved = ['queued', 'pending', 'unknown'].includes(claim.status);
    let status = claim.status;
    if (outcome.status === 'succeeded' && reserved) {
      await db.collection('rewardPolicies').updateOne({ _id: claim.campaignId }, { $inc: { reservedMinor: -claim.amountMinor, spentMinor: claim.amountMinor } }, { session });
      await ledger(db, session, claim, 'settle', claim.amountMinor); status = 'succeeded';
    } else if (outcome.status === 'failed' && reserved) {
      await releaseReservation(db, session, claim); status = 'failed';
    } else if (outcome.status === 'reversed' && reserved) {
      await releaseReservation(db, session, claim); status = 'reversed';
    } else if (outcome.status === 'reversed' && claim.status === 'succeeded') {
      await db.collection('rewardPolicies').updateOne({ _id: claim.campaignId }, { $inc: { spentMinor: -claim.amountMinor, participantCount: -1 } }, { session });
      await db.collection('rewardDaily').updateOne({ _id: `${claim.campaignId}:${claim.day}` }, { $inc: { committedMinor: -claim.amountMinor } }, { session });
      await ledger(db, session, claim, 'reverse', claim.amountMinor); status = 'reversed';
    } else if (['pending', 'unknown'].includes(outcome.status) && reserved) status = outcome.status;
    const reconcile = ['pending', 'unknown'].includes(status) || (status === 'succeeded' && (claim.scenario === 'reversal' || claim.mode === 'vtpass-sandbox') && job.phase === 'submit');
    await db.collection('rewardClaims').updateOne({ _id: claim._id }, { $set: { status, providerReference: outcome.reference, providerCode: outcome.providerCode || null, updatedAt: new Date() } }, { session });
    await db.collection('rewardJobs').updateOne({ _id: job._id, leaseToken: job.leaseToken }, { $set: { status: reconcile ? 'ready' : 'done', phase: reconcile ? 'reconcile' : job.phase, dueAt: new Date(Date.now() + (claim.mode === 'vtpass-sandbox' ? Math.min(3600000, 30000 * 2 ** Math.min(job.attempts, 7)) : 5000)), leaseUntil: new Date(0), lastOutcome: outcome.status, completedAt: reconcile ? null : new Date() }, $unset: { leaseToken: '' } }, { session });
    await db.collection('rewardEvents').insertOne({ organizationId: claim.organizationId, campaignId: claim.campaignId, claimId: claim._id, action: 'provider_checked', outcome: outcome.status, phase: job.phase, attempt: job.attempts, providerCode: outcome.providerCode || null, createdAt: new Date() }, { session });
    settled = true;
  })); return settled;
}
export async function processOne(options = {}) {
  const job = await leaseJob(options); if (!job) return { processed: false };
  const { db } = await database();
  try {
    const claim = await db.collection('rewardClaims').findOne({ _id: job._id, mode: { $in: ['simulator', 'vtpass-sandbox'] } });
    if (!claim) throw new Error('Missing claim.');
    const outcome = claim.mode === 'vtpass-sandbox' ? await vtpassJobOutcome(db, job, claim) : await simulatorOutcome(db, claim, job.phase);
    const processed = await finishJob(job, outcome);
    return { processed, claimId: job._id, outcome: outcome.status };
  } catch (error) {
    // No release/re-send on an exception. The durable lease expires and lookup repeats
    // with the same provider reference, so a crash cannot invent a second payout.
    console.error('Reward worker could not finish job', job._id, error.name);
    throw error;
  }
}

