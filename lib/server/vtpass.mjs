import { randomBytes } from 'node:crypto';
import { AppError } from './access.mjs';
import { requireSimulator } from './reward-common.mjs';
export const VTPASS_PRODUCTS = Object.freeze({ MTN: 'mtn', Airtel: 'airtel', Glo: 'glo', '9mobile': 'etisalat' });
const SANDBOX = 'https://sandbox.vtpass.com/api/';
export function vtpassReadiness() {
  return { provider: 'VTPass', environment: 'sandbox', configured: !!(process.env.VTPASS_SANDBOX_API_KEY && process.env.VTPASS_SANDBOX_SECRET_KEY), enabled: process.env.VTPASS_SANDBOX_ENABLED === 'true', liveEnabled: false };
}
export function requireVtpass() {
  requireSimulator(); const ready = vtpassReadiness();
  if (!ready.configured || !ready.enabled) throw new AppError('Configure and enable the VTPass sandbox before selecting it. Live airtime is disabled.', 503);
}
export function vtpassRequestId(now = new Date()) { return new Date(now.getTime() + 3600000).toISOString().replace(/\D/g, '').slice(0, 12) + randomBytes(12).toString('hex'); }
export function vtpassOutcome(data, expected, phase) {
  const unknown = { status: 'unknown', reference: expected.requestId, providerCode: typeof data?.code === 'string' ? data.code.slice(0, 20) : 'unrecognized' };
  if (!data || typeof data !== 'object') return unknown;
  if (data.requestId && data.requestId !== expected.requestId) return { ...unknown, providerCode: 'reference_mismatch' };
  const transaction = data.content?.transactions;
  const status = transaction?.status;
  if (['000', '001', '040'].includes(data.code)) {
    // Do not settle another transaction or an unexpected amount from a malformed response.
    if (data.requestId !== expected.requestId || !transaction || Math.round(Number(transaction.amount) * 100) !== expected.amountMinor) return { ...unknown, providerCode: 'transaction_mismatch' };
    const reference = typeof transaction.transactionId === 'string' ? transaction.transactionId : expected.requestId;
    if (data.code === '040') return { status: 'reversed', reference, providerCode: data.code };
    if (status === 'delivered') return { status: 'succeeded', reference, providerCode: data.code };
    if (['pending', 'initiated'].includes(status)) return { status: 'pending', reference, providerCode: data.code };
    return unknown;
  }
  if (['099', '089'].includes(data.code)) return { ...unknown, status: 'pending' };
  // Only a definitive purchase refusal can release a new reservation. A failed
  // lookup/authentication or "not found" after a timeout is not proof of no payout.
  if (phase === 'submit' && ['010', '011', '012', '013', '016', '017', '018', '020', '021', '022', '023', '024', '025', '026', '027', '028', '030', '031', '032', '034', '035', '085', '087', '091'].includes(data.code)) return { ...unknown, status: 'failed' };
  if (phase === 'reconcile' && ['016', '091'].includes(data.code) && data.requestId === expected.requestId) return { ...unknown, status: 'failed' };
  return unknown; // Duplicate IDs, ambiguous codes and unexpected bodies always requery.
}
export async function callVtpass(claim, requestId, phase, transport = fetch) {
  requireVtpass();
  const product = VTPASS_PRODUCTS[claim.network]; if (!product) throw new AppError('Unsupported airtime network.');
  // Sandbox recipient is server-owned. No participant phone is transmitted in test mode.
  const phone = { success: '08011111111', failure: '08022222222', pending: '201000000000', timeout: '300000000000', reversal: '500000000000' }[claim.scenario];
  const payload = phase === 'submit' ? { request_id: requestId, serviceID: product, amount: claim.amountMinor / 100, phone } : { request_id: requestId };
  try {
    const response = await transport(SANDBOX + (phase === 'submit' ? 'pay' : 'requery'), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json', 'api-key': process.env.VTPASS_SANDBOX_API_KEY, 'secret-key': process.env.VTPASS_SANDBOX_SECRET_KEY }, body: JSON.stringify(payload) });
    if (!response.ok) return { status: 'unknown', reference: requestId, providerCode: `http_${response.status}` };
    const text = await response.text(); if (text.length > 100000) return { status: 'unknown', reference: requestId, providerCode: 'oversized_response' };
    return vtpassOutcome(JSON.parse(text), { requestId, amountMinor: claim.amountMinor }, phase);
  } catch { return { status: 'unknown', reference: requestId, providerCode: 'transport_unknown' }; }
}
export async function vtpassJobOutcome(db, job, claim, transport = fetch) {
  requireVtpass();
  // Persist the request identity before any network call. A crash after this write
  // permits lookup only. We deliberately never resend a possibly accepted request.
  const current = await db.collection('rewardJobs').findOne({ _id: job._id, leaseToken: job.leaseToken, status: 'leased', leaseUntil: { $gt: new Date() } });
  if (!current) throw new AppError('Worker lease expired.', 409);
  if (current.providerRequestId) return callVtpass(claim, current.providerRequestId, 'reconcile', transport);
  const requestId = vtpassRequestId();
  const changed = await db.collection('rewardJobs').updateOne({ _id: job._id, leaseToken: job.leaseToken, providerRequestId: { $exists: false }, leaseUntil: { $gt: new Date() } }, { $set: { providerRequestId: requestId, dispatchRecordedAt: new Date() } });
  if (!changed.modifiedCount) throw new AppError('Worker lease changed.', 409);
  return callVtpass(claim, requestId, 'submit', transport);
}
