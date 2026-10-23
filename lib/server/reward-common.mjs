import { createHmac } from 'node:crypto';
import { AppError } from './access.mjs';
export const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];
export const SCENARIOS = ['success', 'failure', 'pending', 'timeout', 'reversal'];
export function requireSimulator() {
  if (process.env.APP_MODE !== 'local' || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.APP_URL).hostname)) throw new AppError('Live rewards are not connected. This feature is available only in the local simulator.', 503);
}
export function secretHash(value) {
  if (!process.env.BETTER_AUTH_SECRET) throw new Error('Configure BETTER_AUTH_SECRET.');
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(value).digest('hex');
}
export function participantFrom(headers) { return headers.get('cookie')?.match(/(?:^|;\s*)eq_participant=([a-f0-9]{48})(?:;|$)/)?.[1]; }
export function challengeId(code, participant) {
  if (!/^[a-f0-9]{48}$/.test(participant || '')) throw new AppError('Verify your phone before continuing.', 401);
  return secretHash(`session:${code}:${participant}`);
}
export function lagosDay(date = new Date()) { return new Date(date.getTime() + 3600000).toISOString().slice(0, 10); }
export function cleanReference(value = '') {
  if (typeof value !== 'string' || value.length > 80) throw new AppError('Enter a valid invitation or customer reference.');
  const normalized = value.trim().toUpperCase();
  if (normalized && !/^[A-Z0-9_-]{4,80}$/.test(normalized)) throw new AppError('References use 4–80 letters, numbers, hyphens or underscores.');
  return normalized;
}
export async function rewardIndexes(db) {
  await Promise.all([
    db.collection('rewardClaims').createIndex({ campaignId: 1, phoneHash: 1 }, { unique: true }),
    db.collection('rewardClaims').createIndex({ campaignId: 1, participantHash: 1, idempotencyKey: 1 }, { unique: true }),
    db.collection('rewardClaims').createIndex({ organizationId: 1, createdAt: -1 }),
    db.collection('rewardLedger').createIndex({ claimId: 1, kind: 1 }, { unique: true }),
    db.collection('rewardJobs').createIndex({ status: 1, dueAt: 1, leaseUntil: 1 }),
    db.collection('rewardJobs').createIndex({ providerRequestId: 1 }, { unique: true, sparse: true }),
  ]);
}
export function publicPolicy(policy) {
  return policy ? { enabled: policy.enabled, revision: policy.revision, amountMinor: policy.amountMinor, currency: 'NGN', referenceRequired: policy.referenceRequired, reviewRequired: policy.reviewRequired, simulated: true, mode: policy.mode, networks: NETWORKS } : { enabled: false, simulated: true, networks: NETWORKS };
}
export function publicClaim(claim) {
  return { id: claim._id, status: claim.status, amountMinor: claim.amountMinor, currency: 'NGN', network: claim.network, mode: claim.mode, simulated: true, createdAt: claim.createdAt, updatedAt: claim.updatedAt, message: 'Test reward only. No real airtime or money is sent.' };
}

