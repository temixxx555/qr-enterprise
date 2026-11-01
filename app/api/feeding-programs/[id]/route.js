import { context, failure, admin, sameOrigin, body, AppError } from '@/lib/server/access.mjs';
import { updateFeedingProgram } from '@/lib/server/feeding.mjs';

export async function GET(request, { params }) {
  try { const ctx = await context(request.headers); admin(ctx); const { id } = await params; const program = await ctx.db.collection('feedingPrograms').findOne({ _id: id, organizationId: ctx.organization._id }); if (!program) throw new AppError('Feeding Program not found.', 404); return Response.json(program, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request, { params }) {
  try { sameOrigin(request); const ctx = await context(request.headers); admin(ctx); const { id } = await params; return Response.json(await updateFeedingProgram(ctx, id, await body(request)), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return failure(error); }
}
