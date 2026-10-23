import { randomUUID } from 'node:crypto';
import { identity, sameOrigin, body, failure, AppError } from '@/lib/server/access.mjs';
import { database, indexes } from '@/lib/server/db.mjs';
export async function GET(request) {
  try { const user = await identity(request.headers); const { db } = await database(); const memberships = await db.collection('memberships').find({ userId: user.id, status: 'active' }).toArray(); const organizations = await db.collection('organizations').find({ _id: { $in: memberships.map(m => m.organizationId) }, status: 'active' }).toArray(); return Response.json(organizations.map(org => ({ ...org, role: memberships.find(m => m.organizationId === org._id).role }))); } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    sameOrigin(request); const user = await identity(request.headers); const input = await body(request, 5000); const { db, client } = await database(); await indexes();
    if (input.select) { const member = await db.collection('memberships').findOne({ userId: user.id, organizationId: input.select, status: 'active' }); if (!member) throw new AppError('Organization unavailable.', 403); return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie(input.select) } }); }
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) throw new AppError('Enter an organization name, up to 100 characters.');
    const organization = { _id: randomUUID(), name: input.name.trim(), status: 'active', createdAt: new Date() };
    await client.withSession(session => session.withTransaction(async () => { await db.collection('organizations').insertOne(organization, { session }); await db.collection('memberships').insertOne({ userId: user.id, organizationId: organization._id, role: 'owner', status: 'active', createdAt: new Date() }, { session }); }));
    return Response.json(organization, { status: 201, headers: { 'Set-Cookie': cookie(organization._id) } });
  } catch (error) { return failure(error); }
}
function cookie(id) { return `eq_org=${id}; Path=/; HttpOnly; SameSite=Lax${process.env.APP_URL.startsWith('https:') ? '; Secure' : ''}`; }
