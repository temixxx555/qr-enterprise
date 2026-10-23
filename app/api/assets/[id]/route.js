import { database } from '@/lib/server/db.mjs';
import { context, campaignFilter, failure, AppError } from '@/lib/server/access.mjs';
import { available } from '@/lib/server/campaigns.mjs';
import { readAsset } from '@/lib/server/assets.mjs';
export async function GET(request, { params }) {
  try {
    const { id } = await params; if (!/^[a-f0-9]{64}$/.test(id)) throw new AppError('Photo not found.', 404);
    const { db } = await database(); const asset = await db.collection('assets').findOne({ _id: id }); if (!asset) throw new AppError('Photo not found.', 404);
    const organization = await db.collection('organizations').findOne({ _id: asset.organizationId, status: 'active' }); if (!organization) throw new AppError('Photo not found.', 404);
    const publications = await db.collection('campaigns').find({ organizationId: asset.organizationId, publishedAssetIds: id, status: 'Published' }, { projection: { status: 1, startsAt: 1, endsAt: 1 } }).toArray();
    let allowed = publications.some(c => available({ ...c, published: true }));
    if (!allowed) { try { const ctx = await context(request.headers); allowed = ctx.organization._id === asset.organizationId && (ctx.membership.role !== 'manager' || !!await db.collection('campaigns').findOne({ ...campaignFilter(ctx), $or: [{ assetIds: id }, { publishedAssetIds: id }] })); } catch { allowed = false; } }
    if (!allowed) throw new AppError('Photo not found.', 404);
    return new Response(await readAsset(asset), { headers: { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
