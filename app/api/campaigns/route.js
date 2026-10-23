import { context, body, sameOrigin, failure, campaignFilter } from '@/lib/server/access.mjs';
import { createCampaign } from '@/lib/server/campaigns.mjs';
import { indexes } from '@/lib/server/db.mjs';
export async function GET(request) { try { const ctx = await context(request.headers); const campaigns = await ctx.db.collection('campaigns').find(campaignFilter(ctx), { projection: { 'draft.name': 1, status: 1, revision: 1, code: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(200).toArray(); return Response.json(campaigns.map(c => ({ ...c, name: c.draft.name, draft: undefined }))); } catch (error) { return failure(error); } }
export async function POST(request) { try { sameOrigin(request); const ctx = await context(request.headers); await indexes(); return Response.json(await createCampaign(ctx, (await body(request)).page), { status: 201 }); } catch (error) { return failure(error); } }
