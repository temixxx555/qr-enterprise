import { randomUUID } from 'node:crypto';
process.loadEnvFile('.env.local');
Object.assign(process.env, { APP_MODE: 'local', APP_URL: 'http://127.0.0.1:3100', MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr', MONGODB_DB: 'enterpriseqr_qa' });
const { requireVtpass, vtpassRequestId, callVtpass } = await import('../lib/server/vtpass.mjs');
const { database } = await import('../lib/server/db.mjs');
requireVtpass();
const { db, client } = await database();
try {
  const existingId = process.argv.find(value => value.startsWith('--requery='))?.slice(10);
  let record;
  if (existingId) { record = await db.collection('providerAcceptance').findOne({ requestId: existingId }); if (!record) throw new Error('No local acceptance record matches this request ID.'); }
  else { record = { _id: randomUUID(), requestId: vtpassRequestId(), amountMinor: 10000, network: 'MTN', scenario: 'success', createdAt: new Date(), status: 'dispatch-recorded' }; await db.collection('providerAcceptance').insertOne(record); }
  const outcome = await callVtpass(record, record.requestId, existingId ? 'reconcile' : 'submit');
  await db.collection('providerAcceptance').updateOne({ _id: record._id }, { $set: { outcome, checkedAt: new Date() } });
  console.log(JSON.stringify({ environment: 'VTPass sandbox', requestId: record.requestId, ...outcome }));
  if (outcome.status !== 'succeeded') { console.log('Keep this request ID. Requery it; do not create another request to resolve an uncertain outcome.'); process.exitCode = 1; }
} finally { await client.close(); }
