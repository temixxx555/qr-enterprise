import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
process.loadEnvFile('.env.local');
Object.assign(process.env, { APP_MODE: 'local', APP_URL: 'http://127.0.0.1:3100', MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr', MONGODB_DB: 'enterpriseqr_qa' });
const { database } = await import('../lib/server/db.mjs');
const { createPage } = await import('../lib/campaign-page.mjs');
const { processOne, leaseJob, finishJob, simulatorOutcome } = await import('../lib/server/reward-worker.mjs');
const { requireSimulator, lagosDay } = await import('../lib/server/reward-common.mjs');
const { checkBotChallenge } = await import('../lib/server/otp-adapter.mjs');
const { db, client } = await database(); const orgIds = [], campaignIds = [], codes = [], emails = [];
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
async function api(path, actor, input, method = input ? 'POST' : 'GET') {
  const response = await fetch(process.env.APP_URL + path, { method, headers: { Origin: process.env.APP_URL, ...(actor?.cookie ? { Cookie: actor.cookie } : {}), ...(input ? { 'Content-Type': 'application/json' } : {}) }, body: input ? JSON.stringify(input) : undefined });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, cookie: response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') };
}
async function account() {
  const email = `reward-qa-${randomUUID()}@example.test`; emails.push(email);
  const signed = await api('/api/auth/sign-up/email', null, { name: 'Reward QA', email, password: randomUUID() + '!Aa7' }); assert.equal(signed.status, 200, JSON.stringify(signed.data));
  const actor = { cookie: signed.cookie, email, id: signed.data.user.id };
  const org = await api('/api/organizations', actor, { name: 'Fictional reward checks' }); assert.equal(org.status, 201, JSON.stringify(org.data)); orgIds.push(org.data._id); actor.org = org.data._id; actor.cookie += '; ' + org.cookie; return actor;
}
const defaultPolicy = { revision: 0, enabled: true, amountMinor: 10000, allocationMinor: 100000, dailyCapMinor: 100000, participantLimit: 10, referenceRequired: false, reviewRequired: false, scenario: 'success', references: [] };
async function campaign(actor, overrides = {}) {
  const page = createPage('birthday'); page.name = 'Fictional reward test'; page.actions.reward = true;
  const created = await api('/api/campaigns', actor, { page }); assert.equal(created.status, 201, JSON.stringify(created.data));
  campaignIds.push(created.data._id); codes.push(created.data.code);
  const published = await api(`/api/campaigns/${created.data._id}`, actor, { action: 'publish', revision: created.data.revision }, 'PATCH'); assert.equal(published.status, 200, JSON.stringify(published.data));
  const reward = await api(`/api/campaigns/${created.data._id}/rewards`, actor, { ...defaultPolicy, ...overrides }, 'PUT'); assert.equal(reward.status, 200, JSON.stringify(reward.data));
  return { ...published.data, policy: reward.data };
}
async function participant(campaign) {
  const phone = '080' + String(randomInt(10000000, 99999999));
  const endpoint = `/api/public/campaigns/${campaign.code}/verification`;
  const payload = { action: 'request', phone, consent: true, publicationRevision: campaign.publishedRevision };
  const requested = await api(endpoint, null, payload); assert.equal(requested.status, 200, JSON.stringify(requested.data));
  const actor = { cookie: requested.cookie, phone };
  const confirmed = await api(endpoint, actor, { ...payload, action: 'confirm', otp: requested.data.simulatedCode }); assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
  return actor;
}
function payload(campaign, actor, extra = {}) { return { phone: actor.phone, network: 'MTN', reference: '', publicationRevision: campaign.publishedRevision, policyRevision: campaign.policy.revision, idempotencyKey: randomUUID(), ...extra }; }
const claimPath = campaign => `/api/public/campaigns/${campaign.code}/rewards`;
async function claim(campaign, actor, extra) { return api(claimPath(campaign), actor, payload(campaign, actor, extra)); }
async function due(id) { await db.collection('rewardJobs').updateOne({ _id: id }, { $set: { dueAt: new Date(0) } }); }
try {
  const a = await account(), b = await account();
  const scarce = await campaign(a, { allocationMinor: 10000, dailyCapMinor: 10000, participantLimit: 1 });
  check((await api(`/api/campaigns/${scarce._id}/rewards`, b)).status === 404, 'Cross-tenant reward settings are hidden');
  check((await api(`/api/campaigns/${scarce._id}/rewards`, b, defaultPolicy, 'PUT')).status === 404, 'Cross-tenant settings changes denied');
  const participants = []; for (let i = 0; i < 10; i++) participants.push(await participant(scarce));
  check((await api(claimPath(scarce), null, payload(scarce, participants[0]))).status === 401, 'Anonymous claim requires browser-bound verification');
  check((await claim(scarce, participants[0], { amountMinor: 1 })).status === 400, 'Browser cannot choose amount');
  check((await claim(scarce, participants[0], { network: 'prefix-inferred' })).status === 400, 'Explicit supported network required');
  check((await claim(scarce, participants[0], { phone: participants[1].phone })).status === 401, 'Another phone cannot borrow verification');
  check((await api(claimPath(scarce) + '?check=1', participants[0], payload(scarce, participants[0]))).data.eligible, 'Eligibility check is available');
  check(await db.collection('rewardClaims').countDocuments({ campaignId: scarce._id }) === 0, 'Eligibility check does not reserve or create a claim');
  const contenders = await Promise.all(participants.map(p => claim(scarce, p)));
  const winnerIndex = contenders.findIndex(r => r.status === 200); const winner = participants[winnerIndex]; const receipt = contenders[winnerIndex]?.data;
  check(contenders.filter(r => r.status === 200).length === 1, 'Ten simultaneous claims cannot overspend the final allocation');
  check(contenders.filter(r => r.status === 409).length === 9, 'Losing participants receive understandable capacity rejections');
  let budget = await db.collection('rewardPolicies').findOne({ _id: scarce._id });
  check(budget.reservedMinor === 10000 && budget.spentMinor === 0 && budget.participantCount === 1, 'Reservation and participant counters agree');
  const alternate = await claim(scarce, winner, { phone: '+234' + winner.phone.slice(1), network: 'Airtel' });
  check(alternate.data.id === receipt.id && alternate.data.network === 'MTN', 'New keys, phone formatting and changed network cannot create another entitlement');
  check((await api(`/api/public/receipts/${receipt.id}`, winner)).status === 200, 'Participant can read own private receipt');
  check((await api(`/api/public/receipts/${receipt.id}`, participants[(winnerIndex + 1) % 10])).status === 404, 'Another browser cannot read receipt');
  check((await api(`/receipt/${receipt.id}`)).data.includes('Receipt unavailable'), 'Receipt page hides details without cookie');
  check((await api('/api/rewards', b)).data.total === 0, 'Other organization cannot list claims');
  await api(`/api/campaigns/${scarce._id}`, a, { action: 'pause', revision: scarce.revision }, 'PATCH');
  check((await claim(scarce, participants[(winnerIndex + 1) % 10])).status === 409, 'Paused campaign rejects new claims');
  check((await processOne({ organizationId: a.org })).outcome === 'succeeded', 'Existing reservation settles after campaign pause');
  check(!(await processOne({ organizationId: a.org })).processed, 'Completed job cannot settle twice');
  check(await db.collection('rewardLedger').countDocuments({ claimId: receipt.id, kind: 'settle' }) === 1, 'One settlement ledger entry');
  budget = await db.collection('rewardPolicies').findOne({ _id: scarce._id });
  check(budget.reservedMinor === 0 && budget.spentMinor === 10000, 'Settlement transfers reservation to spend');

  const refs = await campaign(a, { referenceRequired: true, reviewRequired: true, references: ['INVITE-ONE', 'CUSTOMER-TWO'] });
  const r1 = await participant(refs), r2 = await participant(refs);
  const publicRules = await api(claimPath(refs));
  check(!JSON.stringify(publicRules.data).includes('INVITE-ONE') && !('references' in publicRules.data), 'Public policy never leaks invitation pool');
  check((await claim(refs, r1, { reference: 'WRONG-CODE' })).status === 409, 'Invalid reference rejected');
  const reviewed = await claim(refs, r1, { reference: ' invite-one ' }); assert.equal(reviewed.status, 200, JSON.stringify(reviewed.data));
  check(reviewed.data.status === 'review', 'Configured review holds a reserved claim');
  check(await db.collection('rewardJobs').countDocuments({ _id: reviewed.data.id }) === 0, 'Review claims cannot enter worker queue early');
  check((await claim(refs, r2, { reference: 'INVITE-ONE' })).status === 409, 'Reference is single-use across phones');
  check((await api('/api/rewards', b, { action: 'approve', id: reviewed.data.id, reason: 'Wrong tenant' })).status === 404, 'Cross-tenant review denied');
  check((await api('/api/rewards', a, { action: 'approve', id: reviewed.data.id, reason: '' })).status === 400, 'Review requires reason');
  check((await api('/api/rewards', a, { action: 'approve', id: reviewed.data.id, reason: 'Fictional invitation checked' })).data.status === 'queued', 'Approval atomically creates job');
  check((await api('/api/rewards', a, { action: 'approve', id: reviewed.data.id, reason: 'Repeat' })).status === 409, 'Repeated approval cannot enqueue twice');
  await processOne({ organizationId: a.org });
  const declined = await claim(refs, r2, { reference: 'CUSTOMER-TWO' });
  check((await api('/api/rewards', a, { action: 'reject', id: declined.data.id, reason: 'Fictional decline' })).data.status === 'rejected', 'Review rejection releases reservation');
  budget = await db.collection('rewardPolicies').findOne({ _id: refs._id }); check(budget.reservedMinor === 0 && budget.participantCount === 1, 'Rejected reservation frees capacity');
  check((await claim(refs, r2, { reference: 'CUSTOMER-TWO' })).data.id === declined.data.id, 'Rejected phone retains single entitlement');

  for (const scenario of ['failure', 'pending', 'timeout', 'reversal']) {
    const c = await campaign(a, { scenario }); const p = await participant(c); const made = await claim(c, p); assert.equal(made.status, 200, JSON.stringify(made.data));
    const first = await processOne({ organizationId: a.org });
    const expected = { failure: 'failed', pending: 'pending', timeout: 'unknown', reversal: 'succeeded' }[scenario];
    check(first.outcome === expected, `${scenario}: deterministic first outcome`);
    budget = await db.collection('rewardPolicies').findOne({ _id: c._id });
    if (['pending', 'timeout'].includes(scenario)) {
      check(budget.reservedMinor === 10000 && budget.spentMinor === 0, `${scenario}: uncertain outcome retains reservation`);
      await due(made.data.id); await processOne({ organizationId: a.org });
      check((await api(`/api/public/receipts/${made.data.id}`, p)).data.status === 'succeeded', `${scenario}: lookup settles original reward`);
    } else if (scenario === 'reversal') {
      await due(made.data.id); await processOne({ organizationId: a.org });
      budget = await db.collection('rewardPolicies').findOne({ _id: c._id });
      check(budget.reservedMinor === 0 && budget.spentMinor === 0 && budget.participantCount === 0, 'Reversal returns budget and capacity');
      check(await db.collection('rewardLedger').countDocuments({ claimId: made.data.id }) === 3, 'Reversal appends reserve, settle and reverse ledger records');
    } else check(budget.reservedMinor === 0 && budget.spentMinor === 0, 'Confirmed failure releases budget');
    check(await db.collection('simulatorTransactions').countDocuments({ _id: made.data.id }) === 1, `${scenario}: exactly one provider transaction`);
  }

  const crash = await campaign(a); const cp = await participant(crash); const crashed = await claim(crash, cp);
  const lease = await leaseJob({ organizationId: a.org }); const stored = await db.collection('rewardClaims').findOne({ _id: crashed.data.id });
  const outcome = await simulatorOutcome(db, stored, lease.phase); // Provider accepted; worker crashes before committing.
  check(!(await leaseJob({ organizationId: a.org })), 'Unexpired lease excludes a competing worker');
  await db.collection('rewardJobs').updateOne({ _id: lease._id }, { $set: { leaseUntil: new Date(0) } });
  const recovery = await leaseJob({ organizationId: a.org });
  check(recovery.leaseToken !== lease.leaseToken, 'Crash recovery acquires a new lease token');
  check(!(await finishJob(lease, outcome)), 'Expired worker is fenced from settlement');
  await finishJob(recovery, await simulatorOutcome(db, stored, recovery.phase));
  check(await db.collection('rewardLedger').countDocuments({ claimId: crashed.data.id, kind: 'settle' }) === 1, 'Crash recovery settles once');
  check(await db.collection('simulatorTransactions').countDocuments({ _id: crashed.data.id }) === 1, 'Crash recovery looks up the same provider transaction');

  const daily = await campaign(a, { dailyCapMinor: 10000 }); const d1 = await participant(daily), d2 = await participant(daily);
  await claim(daily, d1); check((await claim(daily, d2)).data.error.includes('Today'), 'Daily cap applies before total allocation is exhausted');
  const limited = await campaign(a, { participantLimit: 1 }); const l1 = await participant(limited), l2 = await participant(limited);
  await claim(limited, l1); check((await claim(limited, l2)).data.error.includes('participant'), 'Participant cap applies independently of budget');
  const editedPolicy = { ...defaultPolicy, revision: 1, amountMinor: 20000 };
  check((await api(`/api/campaigns/${limited._id}/rewards`, a, editedPolicy, 'PUT')).status === 200, 'Organizer can change future reward amount');
  check((await db.collection('rewardClaims').findOne({ campaignId: limited._id })).amountMinor === 10000, 'Existing claim retains original reward amount');
  check((await api(`/api/campaigns/${limited._id}/rewards`, a, editedPolicy, 'PUT')).status === 409, 'Stale reward settings rejected');
  check((await api(`/api/campaigns/${limited._id}/rewards`, a, { ...editedPolicy, revision: 2, amountMinor: 1, allocationMinor: 1 }, 'PUT')).status === 409, 'Allocation cannot be reduced below commitments');
  check((await claim(limited, l2)).status === 409, 'Stale participant policy version rejected');
  const repeated = await campaign(a); const samePerson = await participant(repeated); const samePayload = payload(repeated, samePerson);
  const repeats = await Promise.all(Array.from({ length: 5 }, () => api(claimPath(repeated), samePerson, samePayload)));
  check(repeats.every(r => r.status === 200) && new Set(repeats.map(r => r.data.id)).size === 1, 'Five simultaneous duplicate clicks return the same claim');
  check((await api(claimPath(repeated), samePerson, { ...samePayload, network: 'Glo' })).status === 409, 'Same idempotency key cannot change payload');
  const refRace = await campaign(a, { referenceRequired: true, references: ['RACE-CODE'] });
  const rr1 = await participant(refRace), rr2 = await participant(refRace);
  const refResults = await Promise.all([claim(refRace, rr1, { reference: 'RACE-CODE' }), claim(refRace, rr2, { reference: 'RACE-CODE' })]);
  check(refResults.filter(r => r.status === 200).length === 1, 'Concurrent participants cannot consume the same invitation twice');
  const unavailable = await campaign(a); const up = await participant(unavailable);
  await db.collection('campaigns').updateOne({ _id: unavailable._id }, { $set: { startsAt: new Date(Date.now() + 3600000) } });
  check((await claim(unavailable, up)).status === 409, 'Future campaign date blocks claims after verification');
  await db.collection('campaigns').updateOne({ _id: unavailable._id }, { $set: { startsAt: null, endsAt: new Date(0) } });
  check((await claim(unavailable, up)).status === 409, 'Ended campaign blocks claims after verification');
  await db.collection('campaigns').updateOne({ _id: unavailable._id }, { $set: { endsAt: null } });
  await db.collection('organizations').updateOne({ _id: a.org }, { $set: { status: 'suspended' } });
  check((await claim(unavailable, up)).status === 409, 'Suspended organization blocks admission after verification');
  await db.collection('organizations').updateOne({ _id: a.org }, { $set: { status: 'active' } });
  await db.collection('phoneChallenges').updateOne({ campaignCode: unavailable.code }, { $set: { expiresAt: new Date(0) } });
  check((await claim(unavailable, up)).status === 401, 'Expired proof cannot authorize a claim');
  const manager = await account();
  const assigned = await api('/api/team', a, { email: manager.email, role: 'manager', status: 'active', campaignIds: [repeated._id] }); assert.equal(assigned.status, 200, JSON.stringify(assigned.data));
  manager.cookie = manager.cookie.replace(/eq_org=[^;]+/g, `eq_org=${a.org}`);
  const managerClaims = await api('/api/rewards', manager);
  check(managerClaims.status === 200 && managerClaims.data.total === 1 && managerClaims.data.claims[0].campaignId === repeated._id, 'Manager only sees claims for assigned campaigns');
  check((await api(`/api/campaigns/${refs._id}/rewards`, manager)).status === 404, 'Manager cannot read unassigned budgets or ledger');
  check((await api(`/api/campaigns/${repeated._id}/rewards`, manager, defaultPolicy, 'PUT')).status === 403, 'Manager cannot change even assigned reward budgets');
  check((await api('/api/rewards', manager, { action: 'process' })).status === 403, 'Manager cannot run settlement');
  check((await api('/api/rewards', manager, { action: 'approve', id: reviewed.data.id, reason: 'Manager attempt' })).status === 403, 'Manager cannot approve claims');
  check(lagosDay(new Date('2026-10-02T23:00:00Z')) === '2026-10-03', 'Daily buckets use Lagos midnight');
  await assert.rejects(checkBotChallenge({ suspicious: true, token: '' }), /bot check/); checks++;
  await checkBotChallenge({ suspicious: true, token: 'local-test' }); checks++;
  process.env.APP_MODE = 'production'; assert.throws(requireSimulator, /Live rewards/); checks++; process.env.APP_MODE = 'local';
  const totals = await db.collection('rewardPolicies').find({ organizationId: a.org }).toArray();
  check(totals.every(p => p.reservedMinor >= 0 && p.spentMinor >= 0 && p.reservedMinor + p.spentMinor <= p.allocationMinor), 'Every campaign preserves budget invariants');
  console.log(`Passed ${checks} reward integration checks: eligibility, races, ledger, review, receipts, simulator and crash recovery.`);
} finally {
  process.env.APP_MODE = 'local';
  for (const name of ['campaigns', 'campaignVersions', 'memberships', 'audit', 'rewardClaims', 'rewardPolicies', 'rewardReferences', 'rewardLedger', 'rewardJobs', 'rewardAllocationHistory', 'simulatorTransactions']) await db.collection(name).deleteMany({ organizationId: { $in: orgIds } });
  await db.collection('rewardDaily').deleteMany({ campaignId: { $in: campaignIds } });
  await db.collection('phoneChallenges').deleteMany({ campaignCode: { $in: codes } });
  await db.collection('organizations').deleteMany({ _id: { $in: orgIds } });
  const users = await db.collection('user').find({ email: { $in: emails } }).toArray(); const ids = users.map(user => user._id);
  for (const name of ['session', 'account']) await db.collection(name).deleteMany({ userId: { $in: [...ids, ...ids.map(String)] } });
  await db.collection('user').deleteMany({ _id: { $in: ids } }); await client.close();
}
