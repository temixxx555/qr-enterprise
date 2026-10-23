import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.loadEnvFile('.env.local');
Object.assign(process.env, { APP_MODE: 'local', APP_URL: 'http://127.0.0.1:3100', MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr', MONGODB_DB: 'enterpriseqr_qa' });
const { database } = await import('../lib/server/db.mjs');
const { createPage } = await import('../lib/campaign-page.mjs');
const { vtpassJobOutcome } = await import('../lib/server/vtpass.mjs');
const { receiveVtpassHint } = await import('../lib/server/reconciliation.mjs');
const { db, client } = await database(); const orgs = [], emails = [], campaignIds = []; let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; }
async function api(path, actor, input, method = input ? 'POST' : 'GET', origin = process.env.APP_URL) {
  const response = await fetch(process.env.APP_URL + path, { method, headers: { Origin: origin, ...(actor?.cookie ? { Cookie: actor.cookie } : {}), ...(input ? { 'Content-Type': 'application/json' } : {}) }, body: input ? JSON.stringify(input) : undefined });
  const raw = await response.text(); let data; try { data = JSON.parse(raw); } catch { data = raw; }
  return { status: response.status, data, cookie: response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') };
}
async function account() {
  const email = `ops-${randomUUID()}@example.test`; emails.push(email);
  const signed = await api('/api/auth/sign-up/email', null, { name: 'Fictional operations QA', email, password: randomUUID() + '!Ab7' }); assert.equal(signed.status, 200, JSON.stringify(signed.data));
  const actor = { cookie: signed.cookie, email, id: signed.data.user.id }; const org = await api('/api/organizations', actor, { name: 'Fictional operations fixture' }); assert.equal(org.status, 201); actor.cookie += '; ' + org.cookie; actor.org = org.data._id; orgs.push(actor.org); return actor;
}
async function campaign(actor, name = 'Operations fixture') {
  const page = createPage('birthday'); page.name = name; page.actions.reward = true; page.actions.rsvp = true;
  const created = await api('/api/campaigns', actor, { page }); assert.equal(created.status, 201); campaignIds.push(created.data._id);
  const published = await api(`/api/campaigns/${created.data._id}`, actor, { action: 'publish', revision: created.data.revision }, 'PATCH'); assert.equal(published.status, 200); return published.data;
}
try {
  const a = await account(), b = await account(), manager = await account(); const c = await campaign(a, '=SUM(1,2)'), other = await campaign(b);
  const at = new Date('2026-10-02T10:00:00Z'); const base = { organizationId: a.org, campaignId: c._id, campaignName: '=SUM(1,2)', createdAt: at };
  const visits = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await db.collection('pageVisits').insertMany(visits.map((id, index) => ({ ...base, _id: id, visitorHash: `fixture-${index % 2}` })));
  const form = c.published.forms.rsvp;
  await db.collection('submissions').insertMany([0, 1, 2].map(index => ({ ...base, _id: randomUUID(), campaignCode: c.code, idempotencyKey: randomUUID(), visitId: index < 2 ? visits[index] : null, workflow: 'rsvp', status: 'new', form, answers: { name: '=HYPERLINK("evil")' }, consent: [] })));
  const states = ['succeeded', 'succeeded', 'failed', 'reversed', 'unknown', 'review', 'queued']; const claims = states.map((status, index) => ({ ...base, _id: randomUUID(), campaignCode: c.code, status, amountMinor: 10000, network: 'MTN', mode: 'simulator', scenario: 'success', phoneHash: `fixture-phone-${index}`, participantHash: `fixture-browser-${index}`, idempotencyKey: randomUUID() }));
  await db.collection('rewardClaims').insertMany(claims);
  await db.collection('rewardPolicies').insertOne({ _id: c._id, organizationId: a.org, allocationMinor: 100000, reservedMinor: 30000, spentMinor: 20000 });
  await db.collection('rewardLedger').insertMany([0, 1, 3].map(index => ({ ...base, claimId: claims[index]._id, kind: 'settle', amountMinor: 10000, simulated: true })).concat([{ ...base, claimId: claims[3]._id, kind: 'reverse', amountMinor: 10000, simulated: true }]));
  await db.collection('rewardJobs').insertOne({ _id: claims[4]._id, organizationId: a.org, campaignId: c._id, status: 'ready', phase: 'reconcile', mode: 'simulator', dueAt: at, attempts: 1, leaseUntil: new Date(0) });
  await db.collection('pageVisits').insertOne({ _id: randomUUID(), organizationId: b.org, campaignId: other._id, createdAt: at, visitorHash: 'other-org' });
  const filters = { from: '2026-10-02', to: '2026-10-02', campaign: c._id }; const query = new URLSearchParams(filters);
  const report = await api('/api/analytics?' + query, a); assert.equal(report.status, 200, JSON.stringify(report.data)); const metrics = report.data;
  check(metrics.visits === 4 && metrics.estimatedVisitors === 2, 'Visit and distinct-browser counts match fixture');
  check(metrics.submissions === 3 && metrics.responseVisits === 2 && metrics.conversionPercent === 50, 'Conversion uses linked visit cohort, excluding unlinked legacy responses');
  check(metrics.claims === 7 && metrics.verifiedParticipants === 7 && metrics.claimSuccessPercent === 50, 'Success denominator includes failures/reversals, not pending/review');
  check(metrics.netSpendMinor === 20000 && metrics.settledMinor === 30000 && metrics.reversedMinor === 10000, 'Spend reconciles with settlement/reversal ledger');
  check(metrics.budget.availableMinor === 50000 && metrics.budget.reservedMinor === 30000, 'Current available budget excludes reservations');
  check((await api('/api/analytics?' + query, b)).status === 404, 'Cross-tenant report campaign denied');
  check((await api('/api/analytics?' + query)).status === 401, 'Anonymous analytics denied');
  check((await api('/api/analytics?from=2026-02-30', a)).status === 400, 'Invalid dates rejected');
  check((await api('/api/analytics?from=2020-01-01&to=2026-10-02', a)).status === 400, 'Excessive report range rejected');
  const empty = await api('/api/analytics?from=2026-09-01&to=2026-09-01', a);
  check(empty.data.visits === 0 && empty.data.conversionPercent === null && empty.data.claimSuccessPercent === null, 'Empty reports have no invented percentages');
  const exportClaims = await api('/api/reports/export', a, { kind: 'claims', filters: { ...filters, status: 'succeeded' } });
  check(exportClaims.status === 200 && exportClaims.data.includes("'=SUM(1,2)"), 'CSV campaign formulas are neutralized');
  check(exportClaims.data.split('\r\n').filter(Boolean).length === 3, 'CSV claim status filter matches UI rows');
  check(!exportClaims.data.includes('fixture-phone'), 'Exports omit phone hashes and participant secrets');
  check((await api('/api/reports/export', b, { kind: 'claims', filters })).status === 404, 'Export cannot bypass tenant filter');
  check((await api('/api/reports/export', a, { kind: 'claims', filters }, 'POST', 'https://wrong.example')).status === 403, 'Foreign-origin exports denied');
  check((await api('/api/reports/export', a, { kind: 'submissions', filters: { ...filters, workflow: 'rsvp', status: 'new' } })).status === 200, 'Response export uses workflow/status filters');
  check((await api('/api/reports/export', a, { kind: 'ledger', filters })).data.includes('reverse'), 'Ledger export retains reversal history');
  check(await db.collection('audit').countDocuments({ organizationId: a.org, action: 'report.export.claims' }) === 1, 'Successful export is audited');
  const assigned = await api('/api/team', a, { email: manager.email, role: 'manager', status: 'active', campaignIds: [] }); assert.equal(assigned.status, 200);
  manager.cookie = manager.cookie.replace(/eq_org=[^;]+/g, `eq_org=${a.org}`);
  check((await api('/api/analytics?' + query, manager)).status === 404, 'Unassigned manager cannot read analytics');
  check((await api('/api/reports/export', manager, { kind: 'claims', filters })).status === 404, 'Unassigned manager cannot export');
  await api('/api/team', a, { email: manager.email, role: 'manager', status: 'active', campaignIds: [c._id] });
  check((await api('/api/analytics?' + query, manager)).data.claims === 7, 'Assigned manager gets scoped metrics');
  check((await api(`/api/rewards/${claims[4]._id}`, b)).status === 404, 'Cross-tenant processing history denied');
  check((await api(`/api/rewards/${claims[4]._id}`, manager)).status === 200, 'Assigned manager can inspect claim history');
  check((await api('/api/rewards', manager, { id: claims[4]._id, action: 'lookup', reason: 'Attempt' })).status === 403, 'Manager cannot schedule lookup');
  check((await api('/api/rewards', a, { id: claims[4]._id, action: 'lookup', reason: 'Check unknown outcome' })).status === 200, 'Administrator can schedule original transaction lookup');
  check((await db.collection('rewardClaims').findOne({ _id: claims[4]._id })).status === 'unknown', 'Scheduling lookup does not settle or release');
  check((await api('/api/rewards', a, { id: claims[4]._id, action: 'lookup', reason: 'Repeat' })).status === 429, 'Repeated manual lookup rate limited');
  check((await api('/api/rewards', a, { id: claims[2]._id, action: 'lookup', reason: 'Unsafe resend' })).status === 409, 'Confirmed failed claim cannot be resent');
  const eventId = randomUUID(); const recorded = await api(`/api/public/campaigns/${c.code}/visits`, null, { eventId });
  check(recorded.status === 200 && recorded.cookie.includes('eq_visitor'), 'Public visit creates first-party browser cookie');
  await api(`/api/public/campaigns/${c.code}/visits`, recorded, { eventId });
  check(await db.collection('pageVisits').countDocuments({ _id: eventId }) === 1, 'Repeated visit event ID is idempotent');
  const answers = Object.fromEntries(form.fields.map(f => [f.id, f.type === 'consent' ? true : f.type === 'radio' ? f.options[0] : f.type === 'number' ? 1 : 'Fictional guest']));
  const response = await api(`/api/public/campaigns/${c.code}/submissions`, recorded, { action: 'rsvp', publicationRevision: c.publishedRevision, idempotencyKey: randomUUID(), visitId: eventId, answers }); assert.equal(response.status, 201, JSON.stringify(response.data));
  check((await db.collection('submissions').findOne({ _id: response.data.receipt })).visitId === eventId, 'Response links only to verified browser visit');
  const forged = await api(`/api/public/campaigns/${c.code}/submissions`, null, { action: 'rsvp', publicationRevision: c.publishedRevision, idempotencyKey: randomUUID(), visitId: eventId, answers }); assert.equal(forged.status, 201);
  check((await db.collection('submissions').findOne({ _id: forged.data.receipt })).visitId === null, 'Forged visit linkage is ignored');

  // VTPass dispatch crash test uses a fake transport; no external API keys or calls.
  Object.assign(process.env, { VTPASS_SANDBOX_ENABLED: 'true', VTPASS_SANDBOX_API_KEY: 'test-only', VTPASS_SANDBOX_SECRET_KEY: 'test-only' });
  const jobId = randomUUID(); const job = { _id: jobId, organizationId: a.org, campaignId: c._id, mode: 'vtpass-sandbox', status: 'leased', leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + 60000), phase: 'submit' };
  await db.collection('rewardJobs').insertOne(job); let purchaseCalls = 0, lookupCalls = 0;
  const fake = async (url, options) => { const payload = JSON.parse(options.body); if (url.endsWith('/pay')) { purchaseCalls++; throw new Error('accepted but timed out'); } lookupCalls++; return Response.json({ code: '000', requestId: payload.request_id, content: { transactions: { status: 'delivered', amount: 100, transactionId: 'fixture-ref' } } }); };
  const testClaim = { amountMinor: 10000, network: 'MTN', scenario: 'success' };
  check((await vtpassJobOutcome(db, job, testClaim, fake)).status === 'unknown', 'VTPass timeout retains uncertain outcome');
  check((await vtpassJobOutcome(db, job, testClaim, fake)).status === 'succeeded' && purchaseCalls === 1 && lookupCalls === 1, 'Restart after dispatch only requeries original request');
  const dispatched = await db.collection('rewardJobs').findOne({ _id: jobId });
  await db.collection('rewardJobs').updateOne({ _id: jobId }, { $set: { status: 'done' }, $unset: { leaseToken: '' } });
  const hint = { type: 'transaction-update', data: { request_id: dispatched.providerRequestId, status: 'delivered', amount: 999999 } };
  const ledgerBefore = await db.collection('rewardLedger').countDocuments({ organizationId: a.org });
  await receiveVtpassHint(hint); await receiveVtpassHint(hint);
  check(await db.collection('providerHints').countDocuments({ claimId: jobId }) === 1, 'Repeated callback hint is deduplicated');
  check(await db.collection('rewardLedger').countDocuments({ organizationId: a.org }) === ledgerBefore, 'Untrusted callback cannot settle or change money');
  check((await db.collection('rewardJobs').findOne({ _id: jobId })).phase === 'reconcile', 'Callback only schedules authenticated lookup');
  const publicHint = await api('/api/providers/vtpass/callback', null, { type: 'unknown', data: { request_id: 'invalid' } });
  check(publicHint.status === 200 && publicHint.data.response === 'success', 'Webhook acknowledges unsupported hint without mutation');
  await db.collection('rewardLedger').insertMany(Array.from({ length: 5001 }, () => ({ ...base, claimId: randomUUID(), kind: 'reserve', amountMinor: 1, simulated: true })));
  check((await api('/api/reports/export', a, { kind: 'ledger', filters })).status === 413, 'Large exports fail explicitly instead of silently truncating');
  check((await api('/api/operations/health', b)).data.backlog === 0, 'Operational health excludes another organization’s queue');
  check((await api('/api/operations/health', manager)).status === 403, 'Manager cannot inspect administrator health controls');
  const health = await fetch(process.env.APP_URL + '/api/health');
  check(health.status === 200 && (await health.json()).status === 'ok', 'Public health endpoint reports database availability without details');
  check(health.headers.get('x-content-type-options') === 'nosniff' && health.headers.get('x-frame-options') === 'DENY', 'Security response headers are present');
  console.log(`Passed ${checks} operations checks: analytics, filters, CSV, scope, visit conversion, reconciliation and VTPass crash/callback handling.`);
} finally {
  for (const name of ['campaigns', 'campaignVersions', 'memberships', 'audit', 'rewardClaims', 'rewardPolicies', 'rewardLedger', 'rewardJobs', 'rewardEvents', 'providerHints', 'submissions', 'pageVisits']) await db.collection(name).deleteMany({ organizationId: { $in: orgs } });
  await db.collection('organizations').deleteMany({ _id: { $in: orgs } });
  const users = await db.collection('user').find({ email: { $in: emails } }).toArray(); const ids = users.map(user => user._id);
  for (const name of ['session', 'account']) await db.collection(name).deleteMany({ userId: { $in: [...ids, ...ids.map(String)] } });
  await db.collection('user').deleteMany({ _id: { $in: ids } }); await client.close();
}
