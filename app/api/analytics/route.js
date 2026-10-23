import { context, failure } from '@/lib/server/access.mjs';
import { analytics } from '@/lib/server/analytics.mjs';
export async function GET(request) {
  try { return Response.json(await analytics(await context(request.headers), Object.fromEntries(new URL(request.url).searchParams)), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return failure(error); }
}
