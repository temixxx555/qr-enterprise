import { reportScope } from '@/lib/server/analytics.mjs';
import { context, failure, AppError } from '@/lib/server/access.mjs';
import { REVIEW_STATES } from '@/lib/server/submissions.mjs';
import { WORKFLOWS } from '@/lib/forms.mjs';
export async function GET(request) {
  try {
    const ctx = await context(request.headers); const query = new URL(request.url).searchParams; const base = (await reportScope(ctx, Object.fromEntries(query))).filter; const filter = { ...base };
    if (query.get('campaign')) filter.$and = [{ campaignId: query.get('campaign') }];
    for (const [key, allowed] of [['status', REVIEW_STATES], ['workflow', WORKFLOWS]]) { const value = query.get(key); if (value) { if (!allowed.includes(value)) throw new AppError('Invalid filter.'); filter[key] = value; } }
    const page = Math.max(1, Math.min(1000, Number(query.get('page')) || 1)); if (!Number.isInteger(page)) throw new AppError('Invalid page number.');
    const [items, total] = await Promise.all([ctx.db.collection('submissions').find(filter, { projection: { campaignName: 1, campaignId: 1, workflow: 1, action: 1, status: 1, createdAt: 1, 'form.title': 1 } }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).toArray(), ctx.db.collection('submissions').countDocuments(filter)]);
    return Response.json({ items, total, page }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

