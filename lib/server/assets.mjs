import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { AppError, campaignFilter } from './access.mjs';
function storageClient() { return new S3Client({ region: process.env.S3_REGION || 'auto', ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}), credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } }); }
export async function readAsset(asset) {
  if (asset.storage === 's3') { const response = await storageClient().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: asset.key })); return Buffer.from(await response.Body.transformToByteArray()); }
  return readFile(`.data/assets/${asset._id}.webp`);
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
    const id = createHash('sha256').update(ctx.organization._id).update(buffer).digest('hex'); const key = `campaign-assets/${ctx.organization._id}/${id}.webp`;
    const existing = await ctx.db.collection('assets').findOne({ _id: id });
    if (!existing) {
      const storage = process.env.S3_BUCKET ? 's3' : 'local';
      if (storage === 's3') await storageClient().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: 'image/webp' }));
      else { if (process.env.APP_MODE !== 'local') throw new AppError('Configure managed photo storage before uploading images.', 503); await mkdir('.data/assets', { recursive: true }); await writeFile(`.data/assets/${id}.webp`, buffer); }
      await ctx.db.collection('assets').updateOne({ _id: id }, { $setOnInsert: { organizationId: ctx.organization._id, storage, key, bytes: buffer.length, createdAt: new Date() } }, { upsert: true });
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
