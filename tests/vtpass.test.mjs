import test from 'node:test';
import assert from 'node:assert/strict';
import { callVtpass, vtpassOutcome, vtpassRequestId, VTPASS_PRODUCTS } from '../lib/server/vtpass.mjs';
const expected = { requestId: '202610021000test123', amountMinor: 10000 };
const delivered = { code: '000', requestId: expected.requestId, content: { transactions: { status: 'delivered', amount: 100, transactionId: 'sandbox-ref' } } };
test('VTPass request ID uses Lagos time and explicit network product mapping', () => {
  assert.match(vtpassRequestId(new Date('2026-10-02T23:59:00Z')), /^202610030059[a-f0-9]{24}$/);
  assert.deepEqual(VTPASS_PRODUCTS, { MTN: 'mtn', Airtel: 'airtel', Glo: 'glo', '9mobile': 'etisalat' });
});
test('VTPass settlement requires matching reference, amount and delivered status', () => {
  assert.equal(vtpassOutcome(delivered, expected, 'submit').status, 'succeeded');
  assert.equal(vtpassOutcome({ ...delivered, requestId: 'different' }, expected, 'submit').status, 'unknown');
  assert.equal(vtpassOutcome({ ...delivered, content: { transactions: { status: 'delivered', amount: 99 } } }, expected, 'submit').status, 'unknown');
  assert.equal(vtpassOutcome({ code: '000' }, expected, 'submit').status, 'unknown');
  assert.equal(vtpassOutcome({ ...delivered, code: '040' }, expected, 'reconcile').status, 'reversed');
});
test('Unclear and duplicate VTPass outcomes never release a reservation', () => {
  for (const code of ['014', '015', '019', '044', '083', '999']) assert.equal(vtpassOutcome({ code }, expected, 'submit').status, 'unknown');
  assert.equal(vtpassOutcome({ code: '018' }, expected, 'submit').status, 'failed');
  assert.equal(vtpassOutcome({ code: '018' }, expected, 'reconcile').status, 'unknown');
  assert.equal(vtpassOutcome({ code: '099' }, expected, 'submit').status, 'pending');
});
test('VTPass transport is sandbox-only, masks destinations and never automatically resends', async () => {
  Object.assign(process.env, { APP_MODE: 'local', APP_URL: 'http://127.0.0.1:3100', VTPASS_SANDBOX_ENABLED: 'true', VTPASS_SANDBOX_API_KEY: 'fixture-key', VTPASS_SANDBOX_SECRET_KEY: 'fixture-secret' });
  const claim = { amountMinor: 10000, network: 'MTN', scenario: 'success' }; let calls = 0;
  const transport = async (url, options) => { calls++; assert.equal(url, 'https://sandbox.vtpass.com/api/pay'); assert.equal(options.redirect, 'error'); assert.equal(options.headers['api-key'], 'fixture-key'); assert.deepEqual(JSON.parse(options.body), { request_id: expected.requestId, serviceID: 'mtn', amount: 100, phone: '08011111111' }); return Response.json(delivered); };
  assert.equal((await callVtpass(claim, expected.requestId, 'submit', transport)).status, 'succeeded'); assert.equal(calls, 1);
  assert.equal((await callVtpass(claim, expected.requestId, 'submit', async () => { calls++; throw new Error('timeout'); })).status, 'unknown'); assert.equal(calls, 2);
  assert.equal((await callVtpass(claim, expected.requestId, 'reconcile', async (url, options) => { assert.ok(url.endsWith('/requery')); assert.deepEqual(JSON.parse(options.body), { request_id: expected.requestId }); return new Response('unavailable', { status: 503 }); })).status, 'unknown');
  process.env.APP_MODE = 'production'; await assert.rejects(callVtpass(claim, expected.requestId, 'submit', transport), /Live rewards/);
});
