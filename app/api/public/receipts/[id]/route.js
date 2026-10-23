import { participantReceipt } from '@/lib/server/claims.mjs';
import { participantFrom } from '@/lib/server/reward-common.mjs';
import { failure } from '@/lib/server/access.mjs';
export async function GET(request, { params }) {
  try { return Response.json(await participantReceipt((await params).id, participantFrom(request.headers)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
