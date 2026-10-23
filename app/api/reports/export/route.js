import { body, context, failure, sameOrigin } from '@/lib/server/access.mjs';
import { exportReport } from '@/lib/server/exports.mjs';
export async function POST(request) {
  try { sameOrigin(request); const { content, filename } = await exportReport(await context(request.headers), await body(request, 4000)); return new Response(content, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } }); }
  catch (error) { return failure(error); }
}
