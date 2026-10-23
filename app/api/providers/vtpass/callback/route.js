import { body, failure } from '@/lib/server/access.mjs';
import { receiveVtpassHint } from '@/lib/server/reconciliation.mjs';
export async function POST(request) {
  try { await receiveVtpassHint(await body(request, 16000)); return Response.json({ response: 'success' }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
