import { context, admin, failure } from '@/lib/server/access.mjs';
import { vtpassReadiness } from '@/lib/server/vtpass.mjs';
export async function GET(request) { try { admin(await context(request.headers)); return Response.json(vtpassReadiness(), { headers: { 'Cache-Control': 'private, no-store' } }); } catch (error) { return failure(error); } }
