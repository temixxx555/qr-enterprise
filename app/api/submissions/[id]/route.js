import { context, body, sameOrigin, failure, AppError, audit } from '@/lib/server/access.mjs';
import { submissionFilter } from '@/lib/server/submissions.mjs';
import { database } from '@/lib/server/db.mjs';
export async function GET(request, { params }) { try { const ctx = await context(request.headers); const record = await ctx.db.collection('submissions').findOne(await submissionFilter(ctx, (await params).id), { projection: { idempotencyKey: 0, payloadHash: 0 } }); if (!record) throw new AppError('Response not found.', 404); return Response.json(record, { headers: { 'Cache-Control': 'private, no-store' } }); } catch (error) { return failure(error); } }
export async function PATCH(request, { params }) {
  try {
    sameOrigin(request); const ctx = await context(request.headers); const id = (await params).id; const input = await body(request, 5000); const filter = await submissionFilter(ctx, id); const { client } = await database();
    await client.withSession(session => session.withTransaction(async () => {
      const record = await ctx.db.collection('submissions').findOne(filter, { session }); if (!record) throw new AppError('Response not found.', 404);
      if (input.revision !== record.revision) throw new AppError('This response changed. Reload before reviewing.', 409);
      const states = record.workflow === 'complaint' ? ['new', 'in_review', 'resolved', 'dismissed'] : ['new', 'reviewed', 'archived'];
      if (!states.includes(input.status)) throw new AppError('Invalid review state.');
      if (typeof input.note !== 'string' || input.note.length > 2000) throw new AppError('Notes must be text up to 2000 characters.');
      if (record.workflow === 'complaint' && ['resolved', 'dismissed'].includes(input.status) && !input.note.trim()) throw new AppError('Add a resolution note before closing a complaint.');
      if (record.notes.length >= 100) throw new AppError('This response has reached its review-history limit.');
      const update = { $set: { status: input.status, reviewedAt: new Date(), reviewedBy: ctx.user.id }, $inc: { revision: 1 }, $push: { notes: { text: input.note.trim(), status: input.status, actorId: ctx.user.id, createdAt: new Date() } } };
      await ctx.db.collection('submissions').updateOne({ ...filter, revision: record.revision }, update, { session }); await audit(ctx, 'submission.reviewed', id, session);
    })); return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
