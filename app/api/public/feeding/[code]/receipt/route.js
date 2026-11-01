import { failure, AppError, body } from '@/lib/server/access.mjs';
import { getFeedingReceipt } from '@/lib/server/feeding.mjs';

export async function POST(request, { params }) {
  try { const { code } = await params; const { token } = await body(request, 500); if (typeof token !== 'string' || token.length > 100) throw new AppError('Application receipt not found.', 404); return Response.json(await getFeedingReceipt(code, token), { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }); }
  catch (error) { return failure(error); }
}
