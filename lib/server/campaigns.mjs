import { randomUUID, randomBytes } from 'node:crypto';
import { createPage, createBlock, normalizePage, validatePage, BLOCK_TYPES, safeImage } from '../campaign-page.mjs';
import { AppError, campaignFilter, audit } from './access.mjs';
import { database } from './db.mjs';
import { storeImages } from './assets.mjs';
import { cleanForm, defaultForm } from '../forms.mjs';
function strings(input, template) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Invalid page content.');
  return Object.fromEntries(Object.entries(template).filter(([, v]) => typeof v === 'string').map(([key, fallback]) => {
    const value = input[key] ?? fallback;
    if (typeof value !== 'string' || value.length > (['banner', 'profile', 'src'].includes(key) ? 1800000 : 4000)) throw new AppError(`Invalid ${key}.`);
    if (['banner', 'profile', 'src'].includes(key) && value && !safeImage(value)) throw new AppError('Use a JPG, PNG or WebP image.');
    return [key, value];
  }));
}
export function cleanPage(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.blocks) || input.blocks.length > 12) throw new AppError('Invalid page sections.');
  const page = { ...strings(input, createPage()), pageVersion: 2, bannerPosition: Number(input.bannerPosition), actions: {}, labels: {} };
  try { page.forms = Object.fromEntries(['feedback', 'rsvp'].map(action => [action, cleanForm(input.forms?.[action] ?? defaultForm(action))])); } catch (error) { throw new AppError(error.message); }
  if (page.forms.rsvp.workflow !== 'rsvp' || page.forms.feedback.workflow === 'rsvp') throw new AppError('RSVP and response forms must use their matching workflows.');
  for (const key of ['reward', 'feedback', 'rsvp']) { page.actions[key] = input.actions?.[key] === true; page.labels[key] = typeof input.labels?.[key] === 'string' ? input.labels[key].slice(0, 65) : createPage().labels[key]; }
  page.blocks = input.blocks.map((block, index) => {
    if (!block || !BLOCK_TYPES.includes(block.type)) throw new AppError('Unknown section type.');
    const item = { ...strings(block, createBlock(block.type)), id: `section-${index}`, visible: block.visible !== false };
    if (block.type === 'links') { if (!Array.isArray(block.items) || block.items.length > 8) throw new AppError('Too many links.'); item.items = block.items.map((link, i) => ({ ...strings(link, { label: '', url: '' }), id: `link-${i}` })); }
    if (block.type === 'gallery') { if (!Array.isArray(block.images) || block.images.length > 4) throw new AppError('Too many gallery photos.'); item.images = block.images.map((image, i) => ({ ...strings(image, { src: '', alt: '', caption: '' }), id: `photo-${i}` })); }
    return item;
  });
  const normalized = normalizePage(page); const errors = validatePage(normalized);
  if (errors.length) throw new AppError(errors.join(' '));
  if (Buffer.byteLength(JSON.stringify(normalized)) > 4000000) throw new AppError('This page exceeds 4 MB. Reduce its photos.', 413);
  return normalized;
}
export async function createCampaign(ctx, page) {
  const prepared = await storeImages(ctx, cleanPage(page));
  const record = { _id: randomUUID(), organizationId: ctx.organization._id, code: randomBytes(12).toString('hex'), draft: prepared.page, assetIds: prepared.assetIds, revision: 1, publishedRevision: null, status: 'Draft', assignedUserIds: [ctx.user.id], createdAt: new Date(), updatedAt: new Date(), createdBy: ctx.user.id };
  const { client } = await database();
  await client.withSession(session => session.withTransaction(async () => { await ctx.db.collection('campaigns').insertOne(record, { session }); await audit(ctx, 'campaign.created', record._id, session); }));
  return record;
}
export async function updateCampaign(ctx, id, input) {
  if (!Number.isInteger(input.revision)) throw new AppError('Reload this campaign before saving.');
  const action = input.action;
  if (!['save', 'publish', 'pause', 'archive'].includes(action)) throw new AppError('Unknown campaign action.');
  if (action !== 'save' && ctx.membership.role === 'manager') throw new AppError('An administrator must publish or change availability.', 403);
  const permitted = await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, id));
  if (!permitted) throw new AppError('Campaign not found.', 404);
  if (permitted.revision !== input.revision || permitted.status === 'Archived') throw new AppError('Campaign changed or archived. Reload before continuing.', 409);
  const prepared = action === 'save' ? await storeImages(ctx, cleanPage(input.page)) : null;
  const { client } = await database(); let result;
  await client.withSession(session => session.withTransaction(async () => {
    const collection = ctx.db.collection('campaigns');
    const current = await collection.findOne(campaignFilter(ctx, id), { session });
    if (!current) throw new AppError('Campaign not found.', 404);
    if (current.status === 'Archived') throw new AppError('Archived campaigns cannot be changed. Duplicate this page to start a new campaign.', 409);
    if (action === 'pause' && current.status !== 'Published') throw new AppError('Only published campaigns can be paused.', 409);
    if (current.revision !== input.revision) throw new AppError('Someone updated this campaign. Reload before continuing.', 409);
    const changes = { updatedAt: new Date(), revision: current.revision + 1 };
    if (action === 'save') { changes.draft = prepared.page; changes.assetIds = prepared.assetIds; }
    if (action === 'publish') {
      for (const key of ['startsAt', 'endsAt']) { if (input[key] && (typeof input[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input[key]))) throw new AppError('Schedule dates must include a time zone.'); changes[key] = input[key] ? new Date(input[key]) : null; if (changes[key] && !Number.isFinite(changes[key].getTime())) throw new AppError('Invalid schedule date.'); }
      if (changes.startsAt && changes.endsAt && changes.endsAt <= changes.startsAt) throw new AppError('The end must be after the start.');
      changes.published = { ...current.draft, blocks: current.draft.blocks.filter(block => block.visible !== false) }; changes.publishedAssetIds = [...new Set([...JSON.stringify(changes.published).matchAll(/\/api\/assets\/([a-f0-9]{64})/g)].map(match => match[1]))]; changes.publishedRevision = current.revision; changes.status = 'Published';
      await ctx.db.collection('campaignVersions').insertOne({ campaignId: id, organizationId: ctx.organization._id, page: current.draft, revision: current.revision, createdAt: new Date() }, { session });
    }
    if (action === 'pause') changes.status = 'Paused';
    if (action === 'archive') changes.status = 'Archived';
    const updated = await collection.updateOne({ ...campaignFilter(ctx, id), revision: input.revision }, { $set: changes }, { session });
    if (!updated.modifiedCount) throw new AppError('Campaign changed. Reload before continuing.', 409);
    await audit(ctx, `campaign.${action}`, id, session); result = { ...current, ...changes };
  })); return result;
}
export function available(record, now = new Date()) { return record.status === 'Published' && !!record.published && (!record.startsAt || new Date(record.startsAt) <= now) && (!record.endsAt || new Date(record.endsAt) > now); }
