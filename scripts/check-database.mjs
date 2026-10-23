import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
try { await client.connect(); await client.db(process.env.MONGODB_DB || 'enterpriseqr').command({ ping: 1 }); console.log('Configured database connection succeeded.'); }
catch (error) { console.error(`Configured database connection failed (${error.code || error.name}). Check DNS/network access and the database IP allowlist.`); process.exitCode = 1; }
finally { await client.close(); }
