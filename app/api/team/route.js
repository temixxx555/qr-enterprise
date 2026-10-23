import { ObjectId } from 'mongodb';
import { context, admin, sameOrigin, body, failure, AppError, audit } from '@/lib/server/access.mjs';
import { database } from '@/lib/server/db.mjs';
export async function GET(request) { try { const ctx = await context(request.headers); admin(ctx); const members = await ctx.db.collection('memberships').find({ organizationId: ctx.organization._id }).toArray(); const users = await ctx.db.collection('user').find({ _id: { $in: members.map(m => ObjectId.isValid(m.userId) ? new ObjectId(m.userId) : m.userId) } }, { projection: { email: 1, name: 1 } }).toArray(); return Response.json(members.map(m => ({ ...m, ...users.find(u => String(u._id) === m.userId), userId: m.userId, _id: String(m._id) }))); } catch (error) { return failure(error); } }
export async function POST(request) {
  try {
    sameOrigin(request); const ctx = await context(request.headers); admin(ctx); const input = await body(request, 10000);
    if (!['admin', 'manager'].includes(input.role) || !['active', 'suspended'].includes(input.status)) throw new AppError('Invalid role or status.');
    if (ctx.membership.role !== 'owner' && input.role === 'admin') throw new AppError('Only the owner can grant administrator access.', 403);
    const user = await ctx.db.collection('user').findOne({ email: String(input.email).trim().toLowerCase() });
    if (!user) throw new AppError('This email needs to create an account first.');
    const userId = String(user._id); const previous = await ctx.db.collection('memberships').findOne({ organizationId: ctx.organization._id, userId });
    if (previous?.role === 'owner' || (ctx.membership.role !== 'owner' && previous?.role === 'admin')) throw new AppError('This member can only be managed by the owner.', 403);
    const assignments = Array.isArray(input.campaignIds) ? input.campaignIds.filter(x => typeof x === 'string').slice(0, 200) : [];
    const { client } = await database();
    await client.withSession(session => session.withTransaction(async () => {
      await ctx.db.collection('memberships').updateOne({ organizationId: ctx.organization._id, userId }, { $set: { role: input.role, status: input.status } }, { upsert: true, session });
      await ctx.db.collection('campaigns').updateMany({ organizationId: ctx.organization._id }, { $pull: { assignedUserIds: userId } }, { session });
      await ctx.db.collection('campaigns').updateMany({ organizationId: ctx.organization._id, _id: { $in: assignments } }, { $addToSet: { assignedUserIds: userId } }, { session });
      await audit(ctx, 'membership.updated', userId, session);
    })); return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
