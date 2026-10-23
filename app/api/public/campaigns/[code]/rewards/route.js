import { database } from '@/lib/server/db.mjs';
import { available } from '@/lib/server/campaigns.mjs';
import { body, failure, sameOrigin, AppError } from '@/lib/server/access.mjs';
import { participantFrom, publicPolicy, requireSimulator } from '@/lib/server/reward-common.mjs';
import { createClaim } from '@/lib/server/claims.mjs';
export async function GET(request, { params }) {
  try {
    requireSimulator(); const { db } = await database(); const campaign = await db.collection('campaigns').findOne({ code: (await params).code });
    if (!campaign || !available(campaign) || !campaign.published.actions.reward || !(await db.collection('organizations').findOne({ _id: campaign.organizationId, status: 'active' }))) throw new AppError('Reward page unavailable.', 404);
    return Response.json(publicPolicy(await db.collection('rewardPolicies').findOne({ _id: campaign._id })), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request, { params }) {
  try {
    sameOrigin(request); const result = await createClaim((await params).code, await body(request, 4000), participantFrom(request.headers), new URL(request.url).searchParams.get('check') === '1');
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
