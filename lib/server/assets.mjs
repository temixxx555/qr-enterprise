import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import { AppError, campaignFilter } from './access.mjs';
function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) throw new AppError('Configure Cloudinary before uploading or serving images.', 503);
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
  return cloudinary;
}
export async function readAsset(asset) {
  // Read previously stored local preview assets without moving or deleting user data.
  // New assets are always written to Cloudinary; this is a temporary compatibility path.
  if (asset.storage === 'local' && /^[a-f0-9]{64}$/.test(asset._id)) return readFile(`.data/assets/${asset._id}.webp`);
  if (asset.storage !== 'cloudinary') throw new AppError('The image is unavailable.', 404);
  const url = configureCloudinary().url(asset.key, { type: 'authenticated', sign_url: true, secure: true, format: 'webp', resource_type: 'image' });
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new AppError('Cloudinary could not provide this image.', 503);
  return Buffer.from(await response.arrayBuffer());
}
export async function storeImages(ctx, page) {
  const copy = structuredClone(page); const ids = new Set();
  async function image(value) {
    if (!value) return '';
    if (value.startsWith('/api/assets/')) {
      const id = value.slice('/api/assets/'.length); const asset = await ctx.db.collection('assets').findOne({ _id: id, organizationId: ctx.organization._id });
      if (!asset) throw new AppError('This photo does not belong to your organization.');
      if (ctx.membership.role === 'manager' && !await ctx.db.collection('campaigns').findOne({ ...campaignFilter(ctx), $or: [{ assetIds: id }, { publishedAssetIds: id }] })) throw new AppError('This photo belongs to an unassigned campaign.', 403);
      ids.add(id); return value;
    }
    let buffer;
    try {
      const source = Buffer.from(value.split(',')[1], 'base64');
      const decoder = sharp(source, { limitInputPixels: 20000000, animated: false });
      const metadata = await decoder.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('format');
      buffer = await decoder.rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { throw new AppError('A photo could not be decoded. Please upload a valid JPG, PNG or WebP.'); }
    const id = createHash('sha256').update(ctx.organization._id).update(buffer).digest('hex'); const key = `enterpriseqr/${ctx.organization._id}/${id}`;
    const existing = await ctx.db.collection('assets').findOne({ _id: id });
    if (!existing) {
      const client = configureCloudinary();
      await new Promise((resolve, reject) => {
        const stream = client.uploader.upload_stream({ public_id: key, overwrite: false, type: 'authenticated', resource_type: 'image', format: 'webp', tags: ['enterpriseqr', `org:${ctx.organization._id}`] }, (error, result) => error ? reject(error) : resolve(result));
        stream.end(buffer);
      }).catch(() => { throw new AppError('Cloudinary image upload failed. Check service configuration and try again.', 503); });
      await ctx.db.collection('assets').updateOne({ _id: id }, { $setOnInsert: { organizationId: ctx.organization._id, storage: 'cloudinary', key, bytes: buffer.length, createdAt: new Date() } }, { upsert: true });
    }
    ids.add(id); return `/api/assets/${id}`;
  }
  copy.banner = await image(copy.banner); copy.profile = await image(copy.profile);
  for (const block of copy.blocks) {
    if (block.type === 'banner') block.src = await image(block.src);
    if (block.type === 'gallery') for (const item of block.images) item.src = await image(item.src);
  }
  return { page: copy, assetIds: [...ids] };
}
