import { context, failure, admin, sameOrigin, body } from '@/lib/server/access.mjs';
import { createFeedingProgram } from '@/lib/server/feeding.mjs';
import { indexes } from '@/lib/server/db.mjs';

export async function GET(request) {
  try {
    const ctx = await context(request.headers); admin(ctx);
    const programs = await ctx.db.collection('feedingPrograms').find({ organizationId: ctx.organization._id }, { projection: { name: 1, status: 1, revision: 1, publicCode: 1, updatedAt: 1, enrolledCount: 1 } }).sort({ updatedAt: -1 }).limit(200).toArray();
    return Response.json(programs, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

export async function POST(request) {
  try { sameOrigin(request); const ctx = await context(request.headers); admin(ctx); await indexes(); return Response.json(await createFeedingProgram(ctx, await body(request)), { status: 201, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
