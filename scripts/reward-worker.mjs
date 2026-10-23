import { setTimeout } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (process.argv.includes('--qa')) {
  process.env.APP_MODE = 'local'; process.env.APP_URL = 'http://127.0.0.1:3100';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr'; process.env.MONGODB_DB = 'enterpriseqr_qa';
}
const { processOne } = await import('../lib/server/reward-worker.mjs');
const { requireSimulator } = await import('../lib/server/reward-common.mjs');
const { database } = await import('../lib/server/db.mjs');
requireSimulator();
const workerId = randomUUID(); const { db: workerDb } = await database(); let heartbeatAt = 0;
await workerDb.collection('workerHeartbeats').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
let stop = false; process.on('SIGINT', () => { stop = true; }); process.on('SIGTERM', () => { stop = true; });
console.log('Simulator worker running. No real airtime will be sent.');
do {
  if (Date.now() - heartbeatAt > 15000) { await workerDb.collection('workerHeartbeats').updateOne({ _id: workerId }, { $set: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 86400000) } }, { upsert: true }); heartbeatAt = Date.now(); }
  try { const result = await processOne(); if (result.processed) console.log('Simulated claim', result.claimId, result.outcome); }
  catch { console.error('Job retained for safe recovery after lease expiry.'); }
  if (process.argv.includes('--once')) break;
  await setTimeout(1000);
} while (!stop);
const { client } = await database(); await client.close();
