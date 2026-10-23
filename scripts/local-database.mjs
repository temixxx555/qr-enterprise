import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const dbPath = path.resolve('.data/mongo');
await mkdir(dbPath, { recursive: true });
const server = await MongoMemoryReplSet.create({ instanceOpts: [{ port: 27018, dbPath }], replSet: { count: 1, name: 'enterpriseqr', storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
console.log('Local MongoDB ready on 127.0.0.1:27018. Data persists in .data/mongo. Keep this terminal running.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.stop({ doCleanup: false }); process.exit(0); });
