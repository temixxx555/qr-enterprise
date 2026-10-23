import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
process.loadEnvFile('.env.local');
const secrets = Object.entries(process.env).filter(([key, value]) => !key.startsWith('NEXT_PUBLIC_') && /SECRET|PASSWORD|API_KEY|MONGODB_URI/.test(key) && typeof value === 'string' && value.length >= 12);
async function files(path) { const items = await readdir(path, { withFileTypes: true }); return (await Promise.all(items.map(item => item.isDirectory() ? files(join(path, item.name)) : [join(path, item.name)]))).flat(); }
const paths = (await files('.next/static')).filter(path => /\.(js|json|html|map)$/.test(path)); let scanned = 0;
for (const path of paths) { const content = await readFile(path, 'utf8'); for (const [name, value] of secrets) if (content.includes(value)) throw new Error(`Private configuration value found in a client asset: ${name}. Value withheld.`); scanned++; }
console.log(`Checked ${scanned} client assets for ${secrets.length} configured private values. No matches.`);
