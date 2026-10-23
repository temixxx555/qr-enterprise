import { requireVtpass } from './vtpass.mjs';
import { database } from './db.mjs';
import { admin, AppError, audit, campaignFilter } from './access.mjs';
import { cleanReference, requireSimulator, rewardIndexes, SCENARIOS, secretHash } from './reward-common.mjs';

export async function saveRewardPolicy(ctx, campaignId, input) {
  requireSimulator(); admin(ctx);
  const permitted = ['revision', 'enabled', 'amountMinor', 'allocationMinor', 'dailyCapMinor', 'participantLimit', 'referenceRequired', 'reviewRequired', 'scenario', 'references', 'mode'];
  if (Object.keys(input).some(key => !permitted.includes(key))) throw new AppError('Unknown reward setting.');
  for (const key of ['amountMinor', 'allocationMinor', 'dailyCapMinor', 'participantLimit']) if (!Number.isSafeInteger(input[key]) || input[key] < 1 || input[key] > 1000000000) throw new AppError('Amounts and limits must be positive whole numbers within the supported range.');
  if (input.amountMinor > input.allocationMinor || input.amountMinor > input.dailyCapMinor) throw new AppError('The allocation and daily cap must cover at least one reward.');
  if (!Number.isInteger(input.revision) || !SCENARIOS.includes(input.scenario) || ['enabled', 'referenceRequired', 'reviewRequired'].some(key => typeof input[key] !== 'boolean')) throw new AppError('Invalid reward settings.');
  if (input.references !== undefined && (!Array.isArray(input.references) || input.references.length > 500)) throw new AppError('Add up to 500 references at a time.');
  const mode = input.mode || 'simulator';
  if (!['simulator', 'vtpass-sandbox'].includes(mode)) throw new AppError('Choose simulator or VTPass sandbox. Live payouts are disabled.');
  if (mode === 'vtpass-sandbox') { requireVtpass(); if (input.scenario === 'reversal') throw new AppError('Use the local simulator for reversal testing; VTPass does not document a reversal test number.'); }
  const references = [...new Set((input.references || []).map(cleanReference))];
  if (references.some(value => !value)) throw new AppError('References cannot be empty.');
  const { db, client } = await database(); await rewardIndexes(db); let result;
  await client.withSession(session => session.withTransaction(async () => {
    const campaign = await db.collection('campaigns').findOne(campaignFilter(ctx, campaignId), { session });
    if (!campaign) throw new AppError('Campaign not found.', 404);
    if (campaign.status === 'Archived') throw new AppError('Archived campaigns cannot change reward settings.', 409);
    const current = await db.collection('rewardPolicies').findOne({ _id: campaignId }, { session });
    if ((current?.revision || 0) !== input.revision) throw new AppError('Settings changed. Reload before saving.', 409);
    if (input.allocationMinor < (current?.reservedMinor || 0) + (current?.spentMinor || 0) || input.participantLimit < (current?.participantCount || 0)) throw new AppError('The new limits cannot be below existing commitments.', 409);
    const { references: ignored, revision, ...settings } = input; void ignored;
    result = { ...settings, _id: campaignId, organizationId: ctx.organization._id, revision: revision + 1, reservedMinor: current?.reservedMinor || 0, spentMinor: current?.spentMinor || 0, participantCount: current?.participantCount || 0, mode, updatedAt: new Date() };
    await db.collection('rewardPolicies').replaceOne({ _id: campaignId }, result, { session, upsert: true });
    for (const reference of references) {
      const id = secretHash(`reference:${campaignId}:${reference}`);
      await db.collection('rewardReferences').updateOne({ _id: id }, { $setOnInsert: { campaignId, organizationId: ctx.organization._id, usedBy: null } }, { session, upsert: true });
    }
    await db.collection('campaigns').updateOne({ _id: campaignId }, { $inc: { rewardSettingsWrites: 1 } }, { session });
    await db.collection('rewardAllocationHistory').insertOne({ campaignId, organizationId: ctx.organization._id, previousMinor: current?.allocationMinor || 0, allocationMinor: input.allocationMinor, actorId: ctx.user.id, createdAt: new Date(), simulated: true }, { session });
    await audit(ctx, 'reward.settings.updated', campaignId, session);
  }));
  return result;
}

