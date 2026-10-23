import { context, body, sameOrigin, failure, campaignFilter, AppError } from '@/lib/server/access.mjs';
import { updateCampaign } from '@/lib/server/campaigns.mjs';
export async function GET(request, { params }) { try { const ctx = await context(request.headers); const record = await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, (await params).id)); if (!record) throw new AppError('Campaign not found.', 404); return Response.json(record); } catch (error) { return failure(error); } }
export async function PATCH(request, { params }) { try { sameOrigin(request); const ctx = await context(request.headers); return Response.json(await updateCampaign(ctx, (await params).id, await body(request))); } catch (error) { return failure(error); } }
