import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../lib/phone.mjs';
test('Nigerian mobile formatting resolves to a single identity', () => {
  for (const phone of ['08012345678', '+2348012345678', '0801 234 5678', '+234 (801) 234-5678']) assert.equal(normalizePhone(phone), '+2348012345678');
});
test('Phone normalization rejects extensions, foreign numbers and malformed inputs', () => {
  for (const phone of [null, 8012345678, '+18012345678', '08012345678ext2', '++2348012345678', '080123', '070123456789']) assert.throws(() => normalizePhone(phone));
});
