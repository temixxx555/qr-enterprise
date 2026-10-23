import test from 'node:test';
import assert from 'node:assert/strict';
import { createPage, createBlock, normalizePage, safeImage, safeUrl, textOnColor, validatePage, hasBlockContent, formatEventDate } from '../lib/campaign-page.mjs';

test('birthday and leader presets have independent content and action choices', () => {
  const birthday = createPage('birthday');
  const leader = createPage('leader');
  assert.equal(birthday.actions.rsvp, true);
  assert.equal(birthday.actions.reward, true);
  assert.equal(leader.actions.reward, false);
  birthday.blocks[0].title = 'Changed';
  assert.notEqual(createPage('birthday').blocks[0].title, 'Changed');
});
test('legacy drafts preserve existing information without inventing page sections', () => {
  const upgraded = normalizePage({ name: 'Original', organization: 'Existing owner', description: 'Existing copy', type: 'Reward claim', id: 'old' });
  assert.equal(upgraded.name, 'Original'); assert.equal(upgraded.description, 'Existing copy'); assert.equal(upgraded.id, 'old');
  assert.equal(upgraded.actions.reward, true); assert.deepEqual(upgraded.blocks, []);
});
test('round-trip customization preserves event, ordering, hidden state and disabled actions', () => {
  const page = createPage('birthday'); page.blocks.reverse(); page.blocks[0].visible = false; page.actions = { reward: false, feedback: false, rsvp: false };
  page.bannerPosition = 83; page.color = '#ffffff';
  const restored = normalizePage(JSON.parse(JSON.stringify(page)));
  assert.deepEqual(restored.blocks, page.blocks); assert.deepEqual(restored.actions, page.actions); assert.equal(restored.bannerPosition, 83);
  assert.equal(textOnColor(restored.color), '#14231c'); assert.equal(textOnColor('#000000'), '#ffffff');
});
test('unsafe outbound schemes, credentials and executable image types are rejected', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', '//example.com', 'https://user:pass@example.com', 'file:///tmp/test']) assert.equal(safeUrl(url), '');
  assert.equal(safeUrl('https://example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.equal(safeImage('data:image/svg+xml;base64,PHN2Zz4='), ''); assert.equal(safeImage('https://example.com/photo.jpg'), '');
  assert.equal(safeImage('data:image/png;base64,YWJj'), 'data:image/png;base64,YWJj');
});
test('incomplete links block saving and malformed stored arrays normalize safely', () => {
  const page = createPage(); page.blocks[1].items[0] = { label: 'Website', url: 'javascript:alert(1)' };
  assert.ok(validatePage(page).some(e => e.includes('Each link')));
  page.blocks[1].items[0].url = 'https://example.com'; assert.deepEqual(validatePage(page), []);
  const restored = normalizePage({ ...page, blocks: [{ id: 'x', type: 'gallery', images: null }, { id: 'y', type: 'links', items: null }] });
  assert.deepEqual(restored.blocks[0].images, []); assert.deepEqual(restored.blocks[1].items, []);
});

test('empty or hidden blocks do not appear on participant pages', () => {
  assert.equal(hasBlockContent(createBlock('gallery')), false);
  assert.equal(hasBlockContent(createBlock('links')), false);
  assert.equal(hasBlockContent(createBlock('banner')), false);
  assert.equal(hasBlockContent({ ...createBlock('text'), body: 'Hello', visible: false }), false);
  assert.equal(hasBlockContent({ ...createBlock('banner'), src: 'data:image/png;base64,YWJj' }), true);
});
test('event dates retain the organizer clock time and banner links are validated', () => {
  assert.equal(formatEventDate('2026-11-14T18:00'), '14 November 2026 at 18:00');
  const page = createPage(); page.blocks.push({ ...createBlock('banner'), url: 'javascript:alert(1)' });
  assert.ok(validatePage(page).some(error => error.includes('Image banners')));
});
