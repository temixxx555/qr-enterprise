import { createHmac, randomInt, randomBytes } from 'node:crypto';
import { database } from './db.mjs';
import { AppError } from './access.mjs';
import { available } from './campaigns.mjs';
import { normalizePhone } from '../phone.mjs';
import { deliverOtp, checkBotChallenge } from './otp-adapter.mjs';

function localOnly() {
  if (process.env.APP_MODE !== 'local' || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.APP_URL).hostname)) throw new AppError('Phone verification is not available yet. Please contact the organizer.', 503);
}
function hash(value) {
  if (!process.env.BETTER_AUTH_SECRET) throw new Error('Verification requires BETTER_AUTH_SECRET.');
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(value).digest('hex');
}
export async function verifyPhone(code, input, participant) {
  localOnly(); // A simulator result must never authorize a production reward.
  if (!/^[a-f0-9]{48}$/.test(participant)) throw new AppError('Restart phone verification.');
  if (!['request', 'confirm'].includes(input.action) || Object.keys(input).some(key => !['action', 'phone', 'otp', 'consent', 'publicationRevision', 'botToken'].includes(key))) throw new AppError('Invalid verification request.');
  let phone; try { phone = normalizePhone(input.phone); } catch (error) { throw new AppError(error.message); }
  const { db } = await database();
  const campaign = await db.collection('campaigns').findOne({ code });
  if (!campaign || !available(campaign) || !campaign.published.actions.reward || !(await db.collection('organizations').findOne({ _id: campaign.organizationId, status: 'active' }))) throw new AppError('This reward page is unavailable.', 404);
  if (input.publicationRevision !== campaign.publishedRevision) throw new AppError('This page changed. Reload before continuing.', 409);
  const collection = db.collection('phoneChallenges');
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const now = new Date(); const phoneHash = hash(`phone:${phone}`); const id = hash(`session:${code}:${participant}`);
  if (input.action === 'request') {
    if (input.consent !== true) throw new AppError('Please agree to phone verification.');
    // Atomic database counters cover both new browsers and alternate phone formatting.
    const limits = db.collection('verificationLimits');
    await limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    for (const [scope, maximum, duration] of [[`phone:${phoneHash}`, 1, 60000], [`campaign:${code}`, 100, 3600000], [`browser:${id}`, 5, 3600000]]) {
      const bucket = Math.floor(now.getTime() / duration);
      const count = await limits.findOneAndUpdate({ _id: hash(`${scope}:${bucket}`) }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * duration) } }, { upsert: true, returnDocument: 'after' });
      if (scope.startsWith('browser:')) await checkBotChallenge({ suspicious: count.count > 2, token: input.botToken });
      if (count.count > maximum) throw new AppError('Too many requests. Please wait before trying again.', 429);
    }
    const otp = String(randomInt(100000, 1000000));
    await collection.replaceOne({ _id: id }, { _id: id, campaignCode: code, phoneHash, otpHash: hash(`${id}:${otp}`), attempts: 0, consumed: false, publicationRevision: campaign.publishedRevision, createdAt: now, expiresAt: new Date(now.getTime() + 300000), consentAt: now }, { upsert: true });
    return deliverOtp({ code: otp });
  }
  if (typeof input.otp !== 'string' || !/^\d{6}$/.test(input.otp)) throw new AppError('Enter the six-digit code.');
  const challenge = await collection.findOneAndUpdate({ _id: id, phoneHash, consumed: false, expiresAt: { $gt: now }, attempts: { $lt: 5 }, publicationRevision: campaign.publishedRevision }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
  if (!challenge) throw new AppError('The code expired, was already used, or has too many attempts. Request a new code.', 409);
  if (challenge.otpHash !== hash(`${id}:${input.otp}`)) throw new AppError('Incorrect code. Please try again.');
  const consumed = await collection.updateOne({ _id: id, phoneHash, otpHash: challenge.otpHash, consumed: false, expiresAt: { $gt: new Date() } }, { $set: { consumed: true, verifiedAt: new Date(), simulated: true } });
  if (!consumed.modifiedCount) throw new AppError('This code has already been used. Request a new code.', 409);
  return { simulated: true, verified: true, message: 'Phone verified in the simulator. You can now check eligibility and request a test reward. No real airtime is sent.' };
}
export function participantToken() { return randomBytes(24).toString('hex'); }

