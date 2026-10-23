import QRCode from 'qrcode';
import { context, campaignFilter, AppError, failure } from '@/lib/server/access.mjs';
export async function GET(request, { params }) {
  try {
    const ctx = await context(request.headers); const record = await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, (await params).id));
    if (!record) throw new AppError('Campaign not found.', 404);
    const url = `${process.env.APP_URL}/q/${record.code}`;
    const png = new URL(request.url).searchParams.get('format') === 'png';
    const options = { errorCorrectionLevel: 'M', margin: 4, width: 1024 };
    const content = png ? await QRCode.toBuffer(url, options) : await QRCode.toString(url, { ...options, type: 'svg' });
    return new Response(content, { headers: { 'Content-Type': png ? 'image/png' : 'image/svg+xml', 'Content-Disposition': `attachment; filename="campaign-${record.code}.${png ? 'png' : 'svg'}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
