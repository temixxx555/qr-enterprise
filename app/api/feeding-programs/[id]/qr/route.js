import QRCode from 'qrcode';
import { context, failure, AppError } from '@/lib/server/access.mjs';

export async function GET(request, { params }) {
  try {
    const ctx = await context(request.headers); const program = await ctx.db.collection('feedingPrograms').findOne({ _id: (await params).id, organizationId: ctx.organization._id });
    if (!program || program.status !== 'Published') throw new AppError('Publish this Feeding Program before downloading its Public program QR.', 409);
    const url = `${process.env.APP_URL}/f/${program.publicCode}`; const png = new URL(request.url).searchParams.get('format') === 'png';
    const options = { errorCorrectionLevel: 'M', margin: 4, width: 1024 };
    const content = png ? await QRCode.toBuffer(url, options) : await QRCode.toString(url, { ...options, type: 'svg' });
    return new Response(content, { headers: { 'Content-Type': png ? 'image/png' : 'image/svg+xml', 'Content-Disposition': `attachment; filename="feeding-program-${program.publicCode}.${png ? 'png' : 'svg'}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
