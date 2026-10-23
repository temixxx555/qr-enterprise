import { sameOrigin, body, failure } from '@/lib/server/access.mjs';
import { newVisitor, visitorToken, recordVisit } from '@/lib/server/visits.mjs';
export async function POST(request, { params }) {
  try {
    sameOrigin(request); const token = visitorToken(request.headers) || newVisitor();
    const result = await recordVisit((await params).code, await body(request, 1000), token);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': `eq_visitor=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(process.env.APP_URL).protocol === 'https:' ? '; Secure' : ''}` } });
  } catch (error) { return failure(error); }
}
