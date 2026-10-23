import { visitorToken } from '@/lib/server/visits.mjs';
import { body, sameOrigin, failure } from '@/lib/server/access.mjs';
import { acceptSubmission } from '@/lib/server/submissions.mjs';
export async function POST(request, { params }) { try { sameOrigin(request); return Response.json(await acceptSubmission((await params).code, await body(request, 100000), visitorToken(request.headers)), { status: 201, headers: { 'Cache-Control': 'no-store' } }); } catch (error) { if (error.fields) return Response.json({ error: error.message, fields: error.fields }, { status: 422 }); return failure(error); } }

