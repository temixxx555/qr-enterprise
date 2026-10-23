import { platformContext } from '@/lib/server/platform.mjs';
import { sameOrigin, body, failure, AppError } from '@/lib/server/access.mjs';
import { database } from '@/lib/server/db.mjs';
export async function GET(request) { try { const { user, db } = await platformContext(request.headers); await db.collection('platformAudit').insertOne({ actorId: user.id, action: 'organizations.listed', createdAt: new Date() }); return Response.json(await db.collection('organizations').find({}, { projection: { name: 1, status: 1, createdAt: 1 } }).limit(200).toArray()); } catch (error) { return failure(error); } }
export async function POST(request) {
  try {
    sameOrigin(request); const { user, db } = await platformContext(request.headers); const input = await body(request, 5000);
    if (typeof input.organizationId !== 'string' || !['active', 'suspended'].includes(input.status) || typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.reason.length > 500) throw new AppError('Choose a status and give a reason of 10–500 characters.');
    const { client } = await database(); await client.withSession(session => session.withTransaction(async () => { const result = await db.collection('organizations').updateOne({ _id: input.organizationId }, { $set: { status: input.status } }, { session }); if (!result.matchedCount) throw new AppError('Organization not found.', 404); await db.collection('platformAudit').insertOne({ actorId: user.id, action: 'organization.status.changed', organizationId: input.organizationId, status: input.status, reason: input.reason.trim(), createdAt: new Date() }, { session }); })); return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
