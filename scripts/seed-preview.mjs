import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
if (process.env.APP_MODE !== 'local' || process.env.APP_URL !== 'http://127.0.0.1:3100') throw new Error('Preview seeding is restricted to the isolated local QA server.');
const email = `preview-${randomUUID()}@example.test`, password = 'LocalPreview!47-Only';
const response = await fetch(process.env.APP_URL + '/api/auth/sign-up/email', { method: 'POST', headers: { Origin: process.env.APP_URL, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Preview organizer', email, password }) });
if (!response.ok) throw new Error('Preview account creation failed.');
await mkdir('.data', { recursive: true }); await writeFile('.data/preview-account.json', JSON.stringify({ email, password, origin: process.env.APP_URL }), { mode: 0o600 });
console.log(`Fictional preview account: ${email}`);
