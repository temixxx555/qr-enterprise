import { MongoClient } from 'mongodb';
const email = process.argv[2];
if (!email) throw new Error('Usage: node --env-file=.env.local scripts/grant-platform-admin.mjs account-email');
const client = await new MongoClient(process.env.MONGODB_URI).connect();
try { const db = client.db(process.env.MONGODB_DB || 'enterpriseqr'); const user = await db.collection('user').findOne({ email: email.trim().toLowerCase() }); if (!user) throw new Error('Create the account before granting access.'); await client.withSession(session => session.withTransaction(async () => { await db.collection('platformRoles').updateOne({ userId: String(user._id) }, { $set: { role: 'super_admin', status: 'active' } }, { upsert: true, session }); await db.collection('platformAudit').insertOne({ actorId: 'operator-cli', action: 'platform.role.granted', userId: String(user._id), createdAt: new Date() }, { session }); })); console.log('Platform role granted and audited.'); } finally { await client.close(); }
