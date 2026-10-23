import { body, failure, sameOrigin } from '@/lib/server/access.mjs';
import { participantToken, verifyPhone } from '@/lib/server/verification.mjs';
export async function POST(request, { params }) {
  try {
    sameOrigin(request);
    const { code } = await params;
    const existing = request.headers.get('cookie')?.match(/(?:^|;\s*)eq_participant=([a-f0-9]{48})(?:;|$)/)?.[1];
    const participant = existing || participantToken();
    const result = await verifyPhone(code, await body(request, 3000), participant);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': `eq_participant=${participant}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(process.env.APP_URL).protocol === 'https:' ? '; Secure' : ''}` } });
  } catch (error) { return failure(error); }
}
