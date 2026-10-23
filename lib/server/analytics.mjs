import { AppError, campaignFilter } from './access.mjs';
import { reportDates, CLAIM_STATES } from '../reporting.mjs';
export async function reportScope(ctx, input = {}) {
  let dates; try { dates = reportDates(input); } catch (error) { throw new AppError(error.message); }
  const campaign = input.campaign || '';
  if (typeof campaign !== 'string' || campaign.length > 100) throw new AppError('Invalid campaign filter.');
  const ids = await ctx.db.collection('campaigns').distinct('_id', campaignFilter(ctx));
  if (campaign && !ids.includes(campaign)) throw new AppError('Campaign not found.', 404);
  const base = { organizationId: ctx.organization._id, campaignId: { $in: campaign ? [campaign] : ids } };
  return { dates, base, filter: { ...base, createdAt: { $gte: dates.start, $lt: dates.end } } };
}
export function claimStateFilter(filter, status) {
  if (status && !CLAIM_STATES.includes(status)) throw new AppError('Invalid claim status.');
  return status ? { ...filter, status } : filter;
}
async function grouped(db, name, filter, key) {
  return db.collection(name).aggregate([{ $match: filter }, { $group: { _id: `$${key}`, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
}
async function daily(db, name, filter) {
  return db.collection(name).aggregate([{ $match: filter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Africa/Lagos' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
}
export async function analytics(ctx, input = {}) {
  const { dates, base, filter } = await reportScope(ctx, input); const db = ctx.db;
  const [visits, visitors, responseVisits, submissions, states, identities, ledger, budgets, visitDays, responseDays, queue, unsettled] = await Promise.all([
    db.collection('pageVisits').countDocuments(filter),
    db.collection('pageVisits').aggregate([{ $match: filter }, { $group: { _id: '$visitorHash' } }, { $count: 'count' }]).toArray(),
    db.collection('pageVisits').aggregate([{ $match: filter }, { $lookup: { from: 'submissions', let: { visit: '$_id', campaign: '$campaignId', organization: '$organizationId' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$visitId', '$$visit'] }, { $eq: ['$campaignId', '$$campaign'] }, { $eq: ['$organizationId', '$$organization'] }] } } }, { $limit: 1 }], as: 'responses' } }, { $match: { 'responses.0': { $exists: true } } }, { $count: 'count' }]).toArray(),
    grouped(db, 'submissions', filter, 'workflow'), grouped(db, 'rewardClaims', filter, 'status'),
    db.collection('rewardClaims').aggregate([{ $match: filter }, { $group: { _id: '$phoneHash' } }, { $count: 'count' }]).toArray(),
    db.collection('rewardLedger').aggregate([{ $match: filter }, { $group: { _id: '$kind', amountMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } }]).toArray(),
    db.collection('rewardPolicies').aggregate([{ $match: { organizationId: base.organizationId, _id: base.campaignId } }, { $group: { _id: null, allocatedMinor: { $sum: '$allocationMinor' }, reservedMinor: { $sum: '$reservedMinor' }, spentMinor: { $sum: '$spentMinor' } } }]).toArray(),
    daily(db, 'pageVisits', filter), daily(db, 'submissions', filter), grouped(db, 'rewardJobs', { ...base, status: { $ne: 'done' } }, 'status'),
    db.collection('rewardClaims').countDocuments({ ...base, status: { $in: ['pending', 'unknown'] } }),
  ]);
  const counts = Object.fromEntries(states.map(s => [s._id, s.count]));
  const settled = ledger.find(e => e._id === 'settle')?.amountMinor || 0; const reversed = ledger.find(e => e._id === 'reverse')?.amountMinor || 0;
  const budget = budgets[0] || { allocatedMinor: 0, reservedMinor: 0, spentMinor: 0 }; delete budget._id;
  const terminal = (counts.succeeded || 0) + (counts.failed || 0) + (counts.reversed || 0);
  const responseCount = responseVisits[0]?.count || 0;
  return { from: dates.from, to: dates.to, generatedAt: new Date(), mode: 'simulator', visits, estimatedVisitors: visitors[0]?.count || 0, responseVisits: responseCount, conversionPercent: visits ? responseCount / visits * 100 : null, submissions: submissions.reduce((sum, s) => sum + s.count, 0), submissionsByType: submissions, claims: states.reduce((sum, s) => sum + s.count, 0), claimStates: counts, verifiedParticipants: identities[0]?.count || 0, claimSuccessPercent: terminal ? (counts.succeeded || 0) / terminal * 100 : null, terminalClaims: terminal, settledMinor: settled, reversedMinor: reversed, netSpendMinor: settled - reversed, budget: { ...budget, availableMinor: budget.allocatedMinor - budget.reservedMinor - budget.spentMinor }, dailyVisits: visitDays, dailySubmissions: responseDays, queue, unsettled };
}
