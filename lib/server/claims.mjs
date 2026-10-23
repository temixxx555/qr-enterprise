import { randomUUID } from 'node:crypto';
import { database } from './db.mjs';
import { AppError, admin, audit, campaignFilter } from './access.mjs';
import { available } from './campaigns.mjs';
import { normalizePhone } from '../phone.mjs';
import { requireVtpass } from './vtpass.mjs';
import { challengeId, cleanReference, lagosDay, NETWORKS, publicClaim, requireSimulator, rewardIndexes, secretHash } from './reward-common.mjs';

export async function claimFilter(ctx, id) {
  const ids = ctx.membership.role === 'manager' ? await ctx.db.collection('campaigns').distinct('_id', campaignFilter(ctx)) : null;
  return { organizationId: ctx.organization._id, ...(id ? { _id: id } : {}), ...(ids ? { campaignId: { $in: ids } } : {}) };
}
function validate(input) {
  if (Object.keys(input).some(key => !['phone', 'network', 'reference', 'idempotencyKey', 'publicationRevision', 'policyRevision'].includes(key)) || !NETWORKS.includes(input.network) || !/^[a-f0-9-]{36}$/.test(input.idempotencyKey || '') || !Number.isInteger(input.publicationRevision) || !Number.isInteger(input.policyRevision)) throw new AppError('Invalid reward request. Choose your current network and reload the page if necessary.');
  let phone; try { phone = normalizePhone(input.phone); } catch (error) { throw new AppError(error.message); }
  return { phoneHash: secretHash(`phone:${phone}`), reference: cleanReference(input.reference) };
}
export async function createClaim(code, input, participant, checkOnly = false) {
  requireSimulator(); const { phoneHash, reference } = validate(input); const participantHash = challengeId(code, participant);
  const { db, client } = await database(); await rewardIndexes(db); let result;
  const fingerprint = secretHash(JSON.stringify([phoneHash, input.network, reference, input.publicationRevision, input.policyRevision]));
  const findPrevious = async session => {
    const prior = await db.collection('rewardClaims').findOne({ campaignCode: code, $or: [{ phoneHash }, { participantHash, idempotencyKey: input.idempotencyKey }] }, { session });
    if (prior && (prior.phoneHash !== phoneHash || (prior.idempotencyKey === input.idempotencyKey && prior.fingerprint !== fingerprint))) throw new AppError('This request key was already used for different details.', 409);
    return prior;
  };
  const proof = async session => {
    const verified = await db.collection('phoneChallenges').findOne({ _id: participantHash, phoneHash, consumed: true, simulated: true, verifiedAt: { $exists: true }, expiresAt: { $gt: new Date() }, publicationRevision: input.publicationRevision }, { session });
    if (!verified) throw new AppError('Verify this phone number again before requesting a reward.', 401);
    return verified;
  };
  try {
    await client.withSession(session => session.withTransaction(async () => {
      await proof(session);
      const prior = await findPrevious(session); if (prior) { result = { ...publicClaim(prior), existing: true }; return; }
      const campaign = await db.collection('campaigns').findOne({ code }, { session });
      if (!campaign || !available(campaign) || !campaign.published.actions.reward) throw new AppError('This campaign is not accepting reward requests.', 409);
      if (campaign.publishedRevision !== input.publicationRevision) throw new AppError('The page changed. Reload and verify again.', 409);
      const policy = await db.collection('rewardPolicies').findOne({ _id: campaign._id }, { session });
      if (!policy?.enabled || !['simulator', 'vtpass-sandbox'].includes(policy.mode)) throw new AppError('Rewards have not been opened by the organizer.', 409);
      if (policy.mode === 'vtpass-sandbox') requireVtpass();
      if (policy.revision !== input.policyRevision) throw new AppError('Reward settings changed. Reload before continuing.', 409);
      const organization = await db.collection('organizations').findOne({ _id: campaign.organizationId, status: 'active' }, { session });
      if (!organization) throw new AppError('This campaign is unavailable.', 409);
      const day = lagosDay(); const dailyId = `${campaign._id}:${day}`;
      const daily = await db.collection('rewardDaily').findOne({ _id: dailyId }, { session });
      if (policy.participantCount >= policy.participantLimit) throw new AppError('The participant limit has been reached.', 409);
      if (policy.allocationMinor - policy.reservedMinor - policy.spentMinor < policy.amountMinor) throw new AppError('The reward allocation is fully committed.', 409);
      if ((daily?.committedMinor || 0) + policy.amountMinor > policy.dailyCapMinor) throw new AppError('Today’s reward limit has been reached. Try again tomorrow.', 409);
      const referenceId = reference ? secretHash(`reference:${campaign._id}:${reference}`) : null;
      if (policy.referenceRequired) {
        const entry = referenceId && await db.collection('rewardReferences').findOne({ _id: referenceId, campaignId: campaign._id, usedBy: null }, { session });
        if (!entry) throw new AppError('The invitation or customer reference is invalid or already used.', 409);
      }
      if (checkOnly) { result = { eligible: true, reviewRequired: policy.reviewRequired, amountMinor: policy.amountMinor, simulated: true }; return; }
      const now = new Date(); const id = randomUUID();
      const claim = { _id: id, organizationId: campaign.organizationId, campaignId: campaign._id, campaignCode: code, campaignName: campaign.published.name, phoneHash, participantHash, network: input.network, amountMinor: policy.amountMinor, currency: 'NGN', mode: policy.mode, scenario: policy.scenario, status: policy.reviewRequired ? 'review' : 'queued', reviewFlags: policy.reviewRequired ? ['organizer_review'] : [], publicationRevision: campaign.publishedRevision, policyRevision: policy.revision, day, idempotencyKey: input.idempotencyKey, fingerprint, referenceId: policy.referenceRequired ? referenceId : null, createdAt: now, updatedAt: now };
      // All competing admissions write the policy, campaign and organization in this transaction.
      await db.collection('organizations').updateOne({ _id: campaign.organizationId, status: 'active' }, { $inc: { rewardClaimCount: 1 } }, { session });
      await db.collection('campaigns').updateOne({ _id: campaign._id }, { $inc: { rewardClaimCount: 1 } }, { session });
      await db.collection('phoneChallenges').updateOne({ _id: participantHash }, { $inc: { claimChecks: 1 } }, { session });
      await db.collection('rewardPolicies').updateOne({ _id: campaign._id }, { $inc: { reservedMinor: policy.amountMinor, participantCount: 1 } }, { session });
      await db.collection('rewardDaily').updateOne({ _id: dailyId }, { $inc: { committedMinor: policy.amountMinor }, $setOnInsert: { campaignId: campaign._id, day } }, { upsert: true, session });
      if (claim.referenceId) await db.collection('rewardReferences').updateOne({ _id: referenceId, usedBy: null }, { $set: { usedBy: id } }, { session });
      await db.collection('rewardClaims').insertOne(claim, { session });
      await ledger(db, session, claim, 'reserve', policy.amountMinor);
      if (!policy.reviewRequired) await enqueue(db, session, claim);
      result = publicClaim(claim);
    }));
  } catch (error) {
    if (error.code === 11000) { await proof(); const prior = await findPrevious(); if (prior) return { ...publicClaim(prior), existing: true }; }
    throw error;
  }
  return result;
}
export async function ledger(db, session, claim, kind, amountMinor) {
  await db.collection('rewardLedger').insertOne({ claimId: claim._id, campaignId: claim.campaignId, organizationId: claim.organizationId, kind, amountMinor, currency: 'NGN', simulated: true, createdAt: new Date() }, { session });
}
export async function enqueue(db, session, claim) {
  await db.collection('rewardJobs').insertOne({ _id: claim._id, organizationId: claim.organizationId, campaignId: claim.campaignId, mode: claim.mode, status: 'ready', phase: 'submit', attempts: 0, dueAt: new Date(), leaseUntil: new Date(0) }, { session });
}
export async function releaseReservation(db, session, claim, kind = 'release') {
  await db.collection('rewardPolicies').updateOne({ _id: claim.campaignId }, { $inc: { reservedMinor: -claim.amountMinor, participantCount: -1 } }, { session });
  await db.collection('rewardDaily').updateOne({ _id: `${claim.campaignId}:${claim.day}` }, { $inc: { committedMinor: -claim.amountMinor } }, { session });
  await ledger(db, session, claim, kind, claim.amountMinor);
}
export async function reviewClaim(ctx, id, input) {
  requireSimulator(); admin(ctx);
  if (!['approve', 'reject'].includes(input.action) || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 1000) throw new AppError('Choose a review decision and provide a reason.');
  const { db, client } = await database(); let result;
  await client.withSession(session => session.withTransaction(async () => {
    const claim = await db.collection('rewardClaims').findOne(await claimFilter(ctx, id), { session });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (claim.status !== 'review') throw new AppError('This claim has already been reviewed.', 409);
    if (input.action === 'approve') {
      const campaign = await db.collection('campaigns').findOne(campaignFilter(ctx, claim.campaignId), { session });
      if (!campaign || !available(campaign)) throw new AppError('Resume this campaign before approving the claim.', 409);
      await db.collection('campaigns').updateOne({ _id: campaign._id }, { $inc: { rewardReviews: 1 } }, { session });
      await enqueue(db, session, claim);
    } else await releaseReservation(db, session, claim);
    result = { ...claim, status: input.action === 'approve' ? 'queued' : 'rejected', reviewedBy: ctx.user.id, reviewReason: input.reason.trim(), updatedAt: new Date() };
    await db.collection('rewardClaims').replaceOne({ _id: id, status: 'review' }, result, { session });
    await audit(ctx, `reward.${input.action}`, id, session);
  })); return publicClaim(result);
}
export async function participantReceipt(id, participant) {
  requireSimulator(); const { db } = await database();
  const claim = await db.collection('rewardClaims').findOne({ _id: id });
  if (!claim || !participant) throw new AppError('Receipt not found in this browser.', 404);
  const owner = challengeId(claim.campaignCode, participant);
  if (claim.participantHash !== owner) {
    const proof = await db.collection('phoneChallenges').findOne({ _id: owner, phoneHash: claim.phoneHash, consumed: true, simulated: true, expiresAt: { $gt: new Date() } });
    if (!proof) throw new AppError('Receipt not found in this browser.', 404);
  }
  return publicClaim(claim);
}

