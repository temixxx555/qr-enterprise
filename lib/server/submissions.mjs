import { visitorHash } from './visits.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { database, indexes } from './db.mjs';
import { AppError, campaignFilter } from './access.mjs';
import { available } from './campaigns.mjs';
import { validateAnswers } from '../forms.mjs';
export const REVIEW_STATES = ['new', 'reviewed', 'archived', 'in_review', 'resolved', 'dismissed'];
export async function submissionFilter(ctx, id) {
  const allowed = ctx.membership.role === 'manager' ? await ctx.db.collection('campaigns').distinct('_id', campaignFilter(ctx)) : null;
  return { organizationId: ctx.organization._id, ...(id ? { _id: id } : {}), ...(allowed ? { campaignId: { $in: allowed } } : {}) };
}
export async function acceptSubmission(code, input, visitor) {
  if (!/^[a-f0-9]{24}$/.test(code) || !['feedback', 'rsvp'].includes(input.action) || !Number.isInteger(input.publicationRevision) || !/^[a-f0-9-]{36}$/.test(input.idempotencyKey || '')) throw new AppError('Invalid submission request.');
  if (Object.keys(input).some(key => !['action', 'publicationRevision', 'idempotencyKey', 'answers', 'website', 'visitId'].includes(key))) throw new AppError('Unknown submission properties.');
  if (input.website) throw new AppError('This response could not be accepted.');
  const { db, client } = await database(); await indexes();
  const hash = createHash('sha256').update(JSON.stringify([input.action, input.publicationRevision, input.answers])).digest('hex');
  const receipt = record => { if (record.payloadHash !== hash) throw new AppError('This request key was already used for a different response.', 409); return { receipt: record._id, message: record.form.successMessage }; };
  const previous = await db.collection('submissions').findOne({ campaignCode: code, idempotencyKey: input.idempotencyKey });
  if (previous) return receipt(previous);
  const target = await db.collection('campaigns').findOne({ code }, { projection: { status: 1, published: 1, startsAt: 1, endsAt: 1 } });
  if (!target || !available(target)) throw new AppError('This campaign is not accepting responses.', 409);
  // A database-backed ceiling bounds write volume without storing visitors' IP addresses.
  const minute = Math.floor(Date.now() / 60000);
  const limit = await db.collection('submissionRateLimits').findOneAndUpdate({ _id: `${code}:${minute}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 120000) } }, { upsert: true, returnDocument: 'after' });
  if (limit.count > 60) throw new AppError('This campaign is receiving many responses. Please try again in a minute.', 429);
  let result;
  try {
    await client.withSession(session => session.withTransaction(async () => {
      const existing = await db.collection('submissions').findOne({ campaignCode: code, idempotencyKey: input.idempotencyKey }, { session });
      if (existing) { result = receipt(existing); return; }
      const campaign = await db.collection('campaigns').findOne({ code }, { session });
      if (!campaign || !available(campaign)) throw new AppError('This campaign is not accepting responses.', 409);
      if (campaign.publishedRevision !== input.publicationRevision) throw new AppError('The organizer updated this form. Reload the page before responding.', 409);
      const form = campaign.published.forms?.[input.action];
      if (!campaign.published.actions?.[input.action] || !form) throw new AppError('This form is not open.', 409);
      const validation = validateAnswers(form, input.answers);
      if (Object.keys(validation.errors).length) { const error = new AppError('Please check your answers.', 422); error.fields = validation.errors; throw error; }
      const organization = await db.collection('organizations').updateOne({ _id: campaign.organizationId, status: 'active' }, { $inc: { submissionCount: 1 } }, { session });
      if (!organization.matchedCount) throw new AppError('This campaign is not accepting responses.', 409);
      await db.collection('campaigns').updateOne({ _id: campaign._id, publishedRevision: campaign.publishedRevision, status: 'Published' }, { $inc: { submissionCount: 1 } }, { session });
      const visit = typeof input.visitId === 'string' && visitorHash(visitor) ? await db.collection('pageVisits').findOne({ _id: input.visitId, campaignId: campaign._id, organizationId: campaign.organizationId, visitorHash: visitorHash(visitor) }, { session }) : null;
      const now = new Date();
      const record = { _id: randomUUID(), organizationId: campaign.organizationId, campaignId: campaign._id, campaignCode: code, campaignName: campaign.published.name, publicationRevision: campaign.publishedRevision, action: input.action, workflow: form.workflow, form, answers: validation.values, consent: form.fields.filter(f => f.type === 'consent').map(f => ({ fieldId: f.id, purpose: f.purpose, label: f.label, accepted: validation.values[f.id] === true, recordedAt: now })), visitId: visit?._id || null, createdAt: now, status: 'new', revision: 1, notes: [], idempotencyKey: input.idempotencyKey, payloadHash: hash };
      await db.collection('submissions').insertOne(record, { session }); result = receipt(record);
    }));
  } catch (error) {
    if (error.code === 11000) { const existing = await db.collection('submissions').findOne({ campaignCode: code, idempotencyKey: input.idempotencyKey }); if (existing) return receipt(existing); }
    throw error;
  }
  return result;
}

