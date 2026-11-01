import { failure, body, AppError } from '@/lib/server/access.mjs';
import { publicProgram, submitFeedingApplication } from '@/lib/server/feeding.mjs';

export async function GET(_request, { params }) {
  try { const { code } = await params; const program = await publicProgram(code); if (!program) throw new AppError('Feeding Program not found or unavailable.', 404); return Response.json(program, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }); }
  catch (error) { return failure(error); }
}

export async function POST(request, { params }) {
  try { const { code } = await params; const data = await body(request, 120000); return Response.json(await submitFeedingApplication(code, data), { status: 201, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
