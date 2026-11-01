import { MongoClient } from 'mongodb';
export async function database() {
  if (!process.env.MONGODB_URI) throw new Error('Configure MONGODB_URI before starting the workspace.');
  if (globalThis.enterpriseConnectionUri !== process.env.MONGODB_URI) {
    if (globalThis.enterpriseConnection) globalThis.enterpriseConnection.then(client => client.close()).catch(() => {});
    globalThis.enterpriseConnection = undefined;
    globalThis.enterpriseConnectionUri = process.env.MONGODB_URI;
  }
  globalThis.enterpriseConnection ??= new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).connect().catch(error => { globalThis.enterpriseConnection = undefined; throw error; });
  const client = await globalThis.enterpriseConnection;
  return { client, db: client.db(process.env.MONGODB_DB || 'enterpriseqr') };
}
export async function indexes() {
  const { db } = await database();
  await Promise.all([
    db.collection('memberships').createIndex({ userId: 1, organizationId: 1 }, { unique: true }),
    db.collection('campaigns').createIndex({ code: 1 }, { unique: true }),
    db.collection('campaigns').createIndex({ organizationId: 1, updatedAt: -1 }),
    db.collection('audit').createIndex({ organizationId: 1, createdAt: -1 }),
    db.collection('assets').createIndex({ organizationId: 1 }),
    db.collection('campaignVersions').createIndex({ organizationId: 1, campaignId: 1, revision: 1 }, { unique: true }),
    db.collection('platformRoles').createIndex({ userId: 1 }, { unique: true }),
    db.collection('submissions').createIndex({ campaignCode: 1, idempotencyKey: 1 }, { unique: true }),
    db.collection('submissions').createIndex({ organizationId: 1, campaignId: 1, createdAt: -1 }),
    db.collection('submissions').createIndex({ organizationId: 1, status: 1, createdAt: -1 }),
    db.collection('submissionRateLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('feedingPrograms').createIndex({ organizationId: 1, updatedAt: -1 }),
    db.collection('feedingPrograms').createIndex({ publicCode: 1 }, { unique: true }),
    db.collection('feedingApplications').createIndex({ programId: 1, idempotencyKey: 1 }, { unique: true }),
    db.collection('feedingApplications').createIndex({ organizationId: 1, programId: 1, status: 1, createdAt: -1 }),
    db.collection('feedingApplications').createIndex({ receiptHash: 1 }, { unique: true, sparse: true }),
    db.collection('feedingCredentials').createIndex({ credentialHash: 1 }, { unique: true }),
    db.collection('feedingCredentials').createIndex({ organizationId: 1, enrollmentId: 1, status: 1 }),
    db.collection('feedingRedemptions').createIndex({ organizationId: 1, programId: 1, enrollmentId: 1, createdAt: -1 }),
    db.collection('feedingRedemptions').createIndex({ organizationId: 1, idempotencyKey: 1 }, { unique: true }),
    db.collection('feedingEntitlements').createIndex({ organizationId: 1, enrollmentId: 1, periodKey: 1 }, { unique: true }),
    db.collection('feedingRateLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('feedingScanLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
