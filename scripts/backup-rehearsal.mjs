// Local QA rehearsal only. Never connects to the configured cloud database.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, copyFile, unlink } from 'node:fs/promises';
import sharp from 'sharp';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { MongoClient, BSON } from 'mongodb';
const client = await new MongoClient('mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr').connect();
const source = client.db('enterpriseqr_qa'); const targetName = `enterpriseqr_restore_${randomUUID().replaceAll('-', '')}`;
const target = client.db(targetName); const folder = resolve('.data/backups', targetName); let restored = false;
const digest = value => createHash('sha256').update(value).digest('hex');
const fixtureAsset = digest(targetName); const fixturePath = resolve('.data/assets', `${fixtureAsset}.webp`);
try {
  assert.match(targetName, /^enterpriseqr_restore_[a-f0-9]{32}$/); assert.equal((await target.listCollections().toArray()).length, 0);
  await mkdir(join(folder, 'assets'), { recursive: true });
  await mkdir(resolve('.data/assets'), { recursive: true });
  await writeFile(fixturePath, await sharp('tests/fixtures/test-banner.png').webp().toBuffer(), { flag: 'wx' });
  await source.collection('assets').insertOne({ _id: fixtureAsset, organizationId: targetName, storage: 'local', createdAt: new Date() });
  const names = (await source.listCollections({ type: 'collection' }).toArray()).map(c => c.name).filter(name => !name.startsWith('system.'));
  const snapshot = { createdAt: new Date(), database: 'enterpriseqr_qa', collections: [] };
  await client.withSession(session => session.withTransaction(async () => {
    snapshot.collections = [];
    for (const name of names) { const documents = await source.collection(name).find({}, { session }).limit(50001).toArray(); if (documents.length > 50000) throw new Error('Use database backup tools for collections above 50,000 documents.'); snapshot.collections.push({ name, documents }); }
  }, { readConcern: { level: 'snapshot' } }));
  for (const collection of snapshot.collections) collection.indexes = await source.collection(collection.name).indexes();
  const payload = BSON.EJSON.stringify(snapshot, { relaxed: false }); await writeFile(join(folder, 'snapshot.ejson'), payload, { flag: 'wx' });
  const assets = snapshot.collections.find(c => c.name === 'assets')?.documents.filter(a => a.storage === 'local') || []; const assetHashes = {};
  for (const asset of assets) { assert.match(asset._id, /^[a-f0-9]{64}$/); const bytes = await readFile(resolve('.data/assets', `${asset._id}.webp`)); await copyFile(resolve('.data/assets', `${asset._id}.webp`), join(folder, 'assets', `${asset._id}.webp`)); assetHashes[asset._id] = digest(bytes); }
  await writeFile(join(folder, 'manifest.json'), JSON.stringify({ source: 'enterpriseqr_qa', snapshotSHA256: digest(payload), assets: assetHashes }, null, 2), { flag: 'wx' });
  const saved = await readFile(join(folder, 'snapshot.ejson'), 'utf8'); const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8')); assert.equal(digest(saved), manifest.snapshotSHA256);
  const parsed = BSON.EJSON.parse(saved);
  for (const collection of parsed.collections) {
    await target.createCollection(collection.name);
    for (const index of collection.indexes.filter(index => index.name !== '_id_')) {
      const options = Object.fromEntries(['name', 'unique', 'sparse', 'expireAfterSeconds', 'partialFilterExpression', 'collation'].filter(key => index[key] !== undefined).map(key => [key, index[key]]));
      await target.collection(collection.name).createIndex(index.key, options);
    }
    if (collection.documents.length) await target.collection(collection.name).insertMany(collection.documents);
    assert.equal(await target.collection(collection.name).countDocuments(), collection.documents.length);
    const normalize = documents => BSON.EJSON.stringify(documents.sort((a, b) => String(a._id).localeCompare(String(b._id))), { relaxed: true });
    assert.equal(normalize(await target.collection(collection.name).find().toArray()), normalize(collection.documents));
  }
  for (const [id, hash] of Object.entries(manifest.assets)) assert.equal(digest(await readFile(join(folder, 'assets', `${id}.webp`))), hash);
  const claims = await target.collection('rewardClaims').countDocuments(); const policies = await target.collection('rewardPolicies').find().toArray();
  assert.ok(policies.every(p => p.reservedMinor >= 0 && p.spentMinor >= 0 && p.reservedMinor + p.spentMinor <= p.allocationMinor));
  restored = true; console.log(JSON.stringify({ restored: true, collections: parsed.collections.length, claims, assetsVerified: Object.keys(assetHashes).length, backupFolder: folder, scope: 'Local QA database only; cloud restore not tested' }, null, 2));
} finally {
  // Remove only this newly generated rehearsal database, never the source or an existing database.
  if (restored && /^enterpriseqr_restore_[a-f0-9]{32}$/.test(targetName)) await target.dropDatabase();
  await source.collection('assets').deleteOne({ _id: fixtureAsset, organizationId: targetName });
  await unlink(fixturePath).catch(() => {});
  await client.close();
}
