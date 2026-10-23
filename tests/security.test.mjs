import test from 'node:test';
import assert from 'node:assert/strict';
import { body, sameOrigin, failure, AppError } from '../lib/server/access.mjs';
test('Cross-origin mutations reject missing and foreign origins', () => {
  process.env.APP_URL = 'http://127.0.0.1:3100';
  assert.throws(() => sameOrigin(new Request(process.env.APP_URL)), /origin/);
  assert.throws(() => sameOrigin(new Request(process.env.APP_URL, { headers: { Origin: 'https://foreign.example' } })), /origin/);
  assert.doesNotThrow(() => sameOrigin(new Request(process.env.APP_URL, { headers: { Origin: process.env.APP_URL } })));
});
test('Request parser rejects oversized bodies, arrays and malformed JSON', async () => {
  for (const text of ['[]', 'null', '{bad-json']) await assert.rejects(body(new Request('http://localhost', { method: 'POST', body: text })), /JSON object/);
  await assert.rejects(body(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(200) }) }), 100), /too large/);
  assert.deepEqual(await body(new Request('http://localhost', { method: 'POST', body: '{"value":1}' })), { value: 1 });
});
test('Known errors return no-store responses without stack traces', async () => {
  const result = failure(new AppError('No permission.', 403)); assert.equal(result.status, 403); assert.equal(result.headers.get('cache-control'), 'no-store'); assert.deepEqual(await result.json(), { error: 'No permission.' });
});
