import { context, failure, admin, sameOrigin, body, AppError } from '@/lib/server/access.mjs';
import { reviewFeedingApplication, reissueFeedingCredential } from '@/lib/server/feeding.mjs';

export async function GET(request, { params }) {
  try { const ctx = await context(request.headers); admin(ctx); const { id } = await params; const program = await ctx.db.collection('feedingPrograms').findOne({ _id: id, organizationId: ctx.organization._id }, { projection: { _id: 1 } }); if (!program) throw new AppError('Feeding Program not found.', 404); const apps = await ctx.db.collection('feedingApplications').find({ programId: id, organizationId: ctx.organization._id }, { projection: { applicant: 1, household: 1, status: 1, createdAt: 1, updatedAt: 1, revision: 1 } }).sort({ createdAt: -1 }).limit(200).toArray(); return Response.json(apps, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request, { params }) {
  try { sameOrigin(request); const ctx = await context(request.headers); admin(ctx); const { id } = await params; const input = await body(request, 10000); if (typeof input.applicationId !== 'string') throw new AppError('Application not found.', 404); const app = await ctx.db.collection('feedingApplications').findOne({ _id: input.applicationId, programId: id, organizationId: ctx.organization._id }, { projection: { _id: 1 } }); if (!app) throw new AppError('Application not found.', 404); return Response.json(await reviewFeedingApplication(ctx, app._id, input), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}

export async function POST(request, { params }) {
  try { sameOrigin(request); const ctx = await context(request.headers); admin(ctx); const { id } = await params; const input = await body(request, 5000); if (typeof input.applicationId !== 'string') throw new AppError('Application not found.', 404); const app = await ctx.db.collection('feedingApplications').findOne({ _id: input.applicationId, programId: id, organizationId: ctx.organization._id }, { projection: { _id: 1 } }); if (!app) throw new AppError('Application not found.', 404); return Response.json(await reissueFeedingCredential(ctx, app._id, input.reason), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
