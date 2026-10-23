import { context, admin, failure } from '@/lib/server/access.mjs';
import { operationsHealth } from '@/lib/server/health.mjs';
export async function GET(request) { try { const ctx = await context(request.headers); admin(ctx); return Response.json(await operationsHealth(ctx), { headers: { 'Cache-Control': 'private, no-store' } }); } catch (error) { return failure(error); } }
