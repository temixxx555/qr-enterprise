import { context, failure, admin, sameOrigin, body } from '@/lib/server/access.mjs';
import { checkFeedingCredential, enforceFeedingScanLimit } from '@/lib/server/feeding.mjs';

export async function POST(request) {
  try { sameOrigin(request); const ctx = await context(request.headers); admin(ctx); await enforceFeedingScanLimit(ctx); const input = await body(request, 5000); const result = await checkFeedingCredential(ctx, input); return Response.json({ eligible: true, participant: result.participant, program: result.program, site: result.site, session: result.session, allowanceAvailable: result.allowanceAvailable }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
