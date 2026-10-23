import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env.local')) { console.log('Existing .env.local preserved.'); } else { writeFileSync('.env.local', `APP_MODE=local\nAPP_URL=http://127.0.0.1:3000\nMONGODB_URI=mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr\nMONGODB_DB=enterpriseqr\nBETTER_AUTH_SECRET=${randomBytes(48).toString('hex')}\n`, { mode: 0o600 }); console.log('Local configuration created. Run npm run db:local, then npm run dev in a second terminal.'); }
