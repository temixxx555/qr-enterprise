import { context, failure, admin, sameOrigin, body } from '@/lib/server/access.mjs';
import { confirmFeedingRedemption, enforceFeedingScanLimit } from '@/lib/server/feeding.mjs';

export async function POST(request) {
  try { sameOrigin(request); const ctx = await context(request.headers); admin(ctx); await enforceFeedingScanLimit(ctx); return Response.json(await confirmFeedingRedemption(ctx, await body(request, 5000)), { status: 201, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
