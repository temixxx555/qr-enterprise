import { database } from './db.mjs';
import { getAuth } from './auth.mjs';
export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export async function identity(headers) {
  const session = await (await getAuth()).api.getSession({ headers });
  if (!session) throw new AppError('Please sign in.', 401);
  return session.user;
}
export async function context(headers) {
  const user = await identity(headers);
  const { db } = await database();
  const memberships = await db.collection('memberships').find({ userId: user.id, status: 'active' }).toArray();
  const requested = headers.get('cookie')?.match(/(?:^|;\s*)eq_org=([^;]+)/)?.[1];
  const membership = requested ? memberships.find(m => m.organizationId === requested) : memberships[0];
  if (!membership) throw new AppError('Create or select an active organization.', 403);
  const organization = await db.collection('organizations').findOne({ _id: membership.organizationId, status: 'active' });
  if (!organization) throw new AppError('Organization unavailable.', 403);
  return { user, membership, organization, db };
}
export function admin(ctx) { if (!['owner', 'admin'].includes(ctx.membership.role)) throw new AppError('An organization administrator is required.', 403); }
export function campaignFilter(ctx, id) {
  return { ...(id ? { _id: id } : {}), organizationId: ctx.organization._id, ...(ctx.membership.role === 'manager' ? { assignedUserIds: ctx.user.id } : {}) };
}
export function sameOrigin(request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL).origin) throw new AppError('Request origin is not allowed.', 403);
}
export async function body(request, limit = 4500000) {
  if (Number(request.headers.get('content-length')) > limit) throw new AppError('Page is too large. Reduce the number of photos.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('Missing request body.');
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new AppError('Page is too large. Reduce the number of photos.', 413); } chunks.push(value); }
  try { const parsed = JSON.parse(Buffer.concat(chunks).toString()); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed; } catch { throw new AppError('Expected a JSON object.'); }
}
export function failure(error) { if (!(error instanceof AppError)) console.error('Request failed', { type: error?.name || 'Error' }); return Response.json({ error: error instanceof AppError ? error.message : 'The request could not be completed. Please try again.' }, { status: error instanceof AppError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } }); }
export async function audit(ctx, action, resourceId, session) { await ctx.db.collection('audit').insertOne({ organizationId: ctx.organization._id, actorId: ctx.user.id, action, resourceId, createdAt: new Date() }, { session }); }
