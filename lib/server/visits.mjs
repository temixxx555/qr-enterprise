import { randomBytes } from 'node:crypto';
import { database } from './db.mjs';
import { AppError } from './access.mjs';
import { available } from './campaigns.mjs';
import { secretHash } from './reward-common.mjs';
export function visitorToken(headers) { return headers.get('cookie')?.match(/(?:^|;\s*)eq_visitor=([a-f0-9]{48})(?:;|$)/)?.[1]; }
export function newVisitor() { return randomBytes(24).toString('hex'); }
export function visitorHash(token) { return /^[a-f0-9]{48}$/.test(token || '') ? secretHash(`visitor:${token}`) : null; }
export async function recordVisit(code, input, token) {
  if (Object.keys(input).some(key => !['eventId'].includes(key)) || !/^[a-f0-9-]{36}$/.test(input.eventId || '')) throw new AppError('Invalid visit.');
  const { db } = await database(); const campaign = await db.collection('campaigns').findOne({ code });
  if (!campaign || !available(campaign) || !(await db.collection('organizations').findOne({ _id: campaign.organizationId, status: 'active' }))) throw new AppError('Page unavailable.', 404);
  const hash = visitorHash(token); if (!hash) throw new AppError('Invalid visitor.');
  const now = new Date(); const limits = db.collection('visitLimits');
  await limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const limit = await limits.findOneAndUpdate({ _id: `${code}:${Math.floor(now.getTime() / 60000)}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 120000) } }, { upsert: true, returnDocument: 'after' });
  if (limit.count > 1000) throw new AppError('Visit counter busy.', 429);
  await db.collection('pageVisits').createIndex({ organizationId: 1, campaignId: 1, createdAt: 1 });
  await db.collection('submissions').createIndex({ visitId: 1 });
  const record = { _id: input.eventId, organizationId: campaign.organizationId, campaignId: campaign._id, visitorHash: hash, createdAt: now };
  try { await db.collection('pageVisits').updateOne({ _id: input.eventId }, { $setOnInsert: record }, { upsert: true }); } catch (error) { if (error.code !== 11000) throw error; }
  return { recorded: true };
}
