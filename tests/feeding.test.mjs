import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProgram } from '../lib/server/feeding.mjs';
import { AppError } from '../lib/server/access.mjs';

function sample() {
  return { name: 'Community meals', description: 'Weekly food support.', privacyNotice: 'We use details to review and administer applications.', timezone: 'Africa/Lagos', contact: 'help@example.test', locations: [{ id: 'north', name: 'North hall', address: '1 Main Road' }, { id: 'south', name: 'South hall', address: '2 Market Road' }], sessions: [{ id: 'breakfast', name: 'Breakfast', days: [1, 3, 5], start: '08:00', end: '09:30', locationIds: ['north'] }, { id: 'evening-meal', name: 'Evening meal', days: [2, 4], start: '17:00', end: '18:30', locationIds: ['south'] }], limits: { unit: 'child', period: 'day', maxServings: 2 }, capacity: 80, waitlist: true, eligibility: { manualReview: true, summary: 'Residents in the service area may apply.' }, form: { requirePhoneVerification: false } };
}

test('feeding program supports multiple named sessions, sites and explicit limits', () => {
  const record = cleanProgram(sample());
  assert.equal(record.sessions.length, 2);
  assert.equal(record.sessions[0].name, 'Breakfast');
  assert.deepEqual(record.sessions[1].locationIds, ['south']);
  assert.deepEqual(record.limits, { unit: 'child', period: 'day', maxServings: 2, countNamedSessions: true });
  assert.equal(record.eligibility.manualReview, true);
  assert.equal(record.eligibility.autoApprove, false);
});

test('feeding schedules reject invalid timezone, session window, and allowance choices', () => {
  assert.throws(() => cleanProgram({ ...sample(), timezone: 'Invalid/Timezone' }), AppError);
  assert.throws(() => cleanProgram({ ...sample(), sessions: [{ ...sample().sessions[0], start: '10:00', end: '09:00' }] }), AppError);
  assert.throws(() => cleanProgram({ ...sample(), limits: { unit: 'member', period: 'week', maxServings: 1 } }), AppError);
  assert.doesNotThrow(() => cleanProgram({ ...sample(), locations: [] }), 'incomplete drafts can be saved and are blocked only at publish readiness');
});

test('feeding schedule supports Sunday indexing and only configured location references', () => {
  const input = sample(); input.sessions[0].days = [0, 6]; input.sessions[0].locationIds = ['north', 'unknown'];
  const record = cleanProgram(input);
  assert.deepEqual(record.sessions[0].days, [0, 6]);
  assert.deepEqual(record.sessions[0].locationIds, ['north']);
});
