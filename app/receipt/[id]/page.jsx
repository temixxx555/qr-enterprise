import { headers } from 'next/headers';
import { participantReceipt } from '@/lib/server/claims.mjs';
import { participantFrom } from '@/lib/server/reward-common.mjs';
import RewardReceipt from '@/components/RewardReceipt';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private reward receipt', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Receipt({ params }) {
  let receipt;
  try { receipt = await participantReceipt((await params).id, participantFrom(await headers())); }
  catch { return <main className="receipt-shell"><h1>Receipt unavailable</h1><p>Open this receipt in the browser that requested the reward, or verify your phone again on the campaign page.</p></main>; }
  return <main className="receipt-shell"><RewardReceipt initial={JSON.parse(JSON.stringify(receipt))} /></main>;
}
