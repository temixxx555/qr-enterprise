import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPage, available } from '../lib/server/campaigns.mjs';
import { createPage } from '../lib/campaign-page.mjs';
import { lagosToISO, campaignState } from '../lib/schedule.mjs';
test('server page validation strips tenant, publication and privilege fields', () => {
  const page = cleanPage({ ...createPage('birthday'), organizationId: 'foreign', status: 'Published', role: 'owner', published: {} });
  for (const key of ['organizationId', 'status', 'role', 'published']) assert.equal(page[key], undefined);
  assert.throws(() => cleanPage({ ...page, blocks: [{ type: 'links', items: [null] }] }), /Invalid page content/);
  assert.throws(() => cleanPage({ ...page, website: 'javascript:alert(1)' }), /website link/);
  assert.throws(() => cleanPage({ ...page, banner: 'data:image/svg+xml;base64,AAAA' }), /JPG/);
});
test('Lagos schedule boundaries are inclusive at start and exclusive at end', () => {
  const record = { status: 'Published', published: {}, startsAt: lagosToISO('2026-10-02T00:00'), endsAt: lagosToISO('2026-10-03T00:00') };
  assert.equal(record.startsAt, '2026-10-01T23:00:00.000Z');
  assert.equal(available(record, new Date('2026-10-01T22:59:59Z')), false);
  assert.equal(available(record, new Date(record.startsAt)), true);
  assert.equal(available(record, new Date(record.endsAt)), false);
  assert.equal(campaignState(record, new Date(record.endsAt)), 'Completed');
  assert.equal(available({ ...record, status: 'Paused' }, new Date(record.startsAt)), false);
  assert.throws(() => lagosToISO('2026-02-30T10:00'), /calendar/);
});
