import { AppError, audit } from './access.mjs';
import { analytics, reportScope, claimStateFilter } from './analytics.mjs';
import { csv } from '../reporting.mjs';
import { WORKFLOWS } from '../forms.mjs';
import { REVIEW_STATES } from './submissions.mjs';
export async function exportReport(ctx, input) {
  const { kind, filters = {} } = input;
  if (!['claims', 'submissions', 'ledger', 'summary'].includes(kind) || !filters || typeof filters !== 'object' || Array.isArray(filters)) throw new AppError('Choose a supported export.');
  const { filter: base, dates } = await reportScope(ctx, filters); let filter = base; let rows;
  if (kind === 'summary') {
    const a = await analytics(ctx, filters);
    rows = [['Metric', 'Value', 'Definition'], ['Recorded visits', a.visits, 'Page loads, including shared links; not physical QR scans'], ['Estimated browsers', a.estimatedVisitors, 'Distinct first-party browser cookies in date range'], ['Responses', a.submissions, 'Response creation dates within selected range'], ['Responding visits', a.responseVisits, 'Selected visit cohort with a linked response by report time'], ['Conversion percent', a.conversionPercent, 'Responding visits / selected visits; blank when no visits'], ['Claims', a.claims, 'Claims created within date range'], ['Verified identities', a.verifiedParticipants, 'Distinct phone hashes on claims; simulated verification'], ['Claim success percent', a.claimSuccessPercent, 'Succeeded / (succeeded + failed + reversed); other states excluded'], ['Settled NGN', a.settledMinor / 100, 'Settlement ledger events in date range'], ['Reversed NGN', a.reversedMinor / 100, 'Reversal ledger events in date range'], ['Net spend NGN', a.netSpendMinor / 100, 'Settlements minus reversals by ledger event date'], ['Available NGN now', a.budget.availableMinor / 100, 'Current allocation minus reservations and spend; not date filtered']];
  } else {
    if (kind === 'claims') filter = claimStateFilter(filter, filters.status);
    if (kind === 'submissions') for (const [key, allowed] of [['status', REVIEW_STATES], ['workflow', WORKFLOWS]]) if (filters[key]) { if (!allowed.includes(filters[key])) throw new AppError('Invalid response filter.'); filter[key] = filters[key]; }
    const name = { claims: 'rewardClaims', submissions: 'submissions', ledger: 'rewardLedger' }[kind];
    const projection = kind === 'submissions' ? { campaignName: 1, workflow: 1, status: 1, createdAt: 1, 'form.title': 1, answers: 1, consent: 1 } : kind === 'claims' ? { campaignName: 1, status: 1, amountMinor: 1, network: 1, mode: 1, createdAt: 1, providerReference: 1, reviewReason: 1 } : { claimId: 1, campaignId: 1, kind: 1, amountMinor: 1, simulated: 1, createdAt: 1 };
    const cursor = ctx.db.collection(name).find(filter, { projection }).sort({ createdAt: 1, _id: 1 }).limit(5001).batchSize(25);
    const records = []; let bytes = 0;
    try { for await (const record of cursor) { bytes += Buffer.byteLength(JSON.stringify(record)); if (records.length >= 5000 || bytes > 10000000) throw new AppError('This export exceeds 5,000 rows or 10 MB. Narrow the campaign or date filters.', 413); records.push(record); } }
    finally { await cursor.close(); }
    if (kind === 'claims') rows = [['Claim ID', 'Campaign', 'Status', 'Amount NGN', 'Network', 'Mode', 'Created UTC', 'Provider reference', 'Review reason'], ...records.map(r => [r._id, r.campaignName, r.status, r.amountMinor / 100, r.network, r.mode, r.createdAt.toISOString(), r.providerReference, r.reviewReason])];
    if (kind === 'ledger') rows = [['Claim ID', 'Campaign ID', 'Entry', 'Amount NGN', 'Simulated', 'Created UTC'], ...records.map(r => [r.claimId, r.campaignId, r.kind, r.amountMinor / 100, r.simulated, r.createdAt.toISOString()])];
    if (kind === 'submissions') rows = [['Response ID', 'Campaign', 'Workflow', 'Status', 'Created UTC', 'Original form title', 'Answers JSON', 'Consent JSON'], ...records.map(r => [r._id, r.campaignName, r.workflow, r.status, r.createdAt.toISOString(), r.form.title, JSON.stringify(r.answers), JSON.stringify(r.consent)])];
  }
  const content = csv(rows);
  await audit(ctx, `report.export.${kind}`, JSON.stringify({ campaign: filters.campaign || 'all-permitted', from: dates.from, to: dates.to, status: filters.status || '', workflow: filters.workflow || '', rows: rows.length - 1 }));
  return { content, filename: `enterpriseqr-${kind}-${dates.from}-${dates.to}.csv` };
}
