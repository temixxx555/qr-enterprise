import { database } from '@/lib/server/db.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { const { db } = await database(); await db.command({ ping: 1 }); return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
