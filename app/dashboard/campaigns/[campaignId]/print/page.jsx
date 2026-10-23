/* eslint-disable @next/next/no-img-element -- Locally generated QR raster. */
import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { campaignFilter } from '@/lib/server/access.mjs';
import { pageContext as context } from '@/lib/server/page-context';
import PrintQr from '@/components/PrintQr';
export default async function Print({ params }) {
  const ctx = await context(await headers()); const campaign = await ctx.db.collection('campaigns').findOne(campaignFilter(ctx, (await params).campaignId)); if (!campaign) notFound();
  const url = `${process.env.APP_URL}/q/${campaign.code}`; const image = await QRCode.toDataURL(url, { width: 1000, margin: 4, errorCorrectionLevel: 'M' });
  return <section className="qr-print panel account-card"><h1>{campaign.draft.name}</h1><p>Scan to open this page</p><img src={image} alt={`QR code for ${campaign.draft.name}`} width="360" height="360" /><p className="share-address">{url}</p><PrintQr /><p className="print-action">Publish the page and configure your public domain before distributing this code.</p></section>;
}
