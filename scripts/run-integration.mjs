import { spawn } from 'node:child_process';
process.loadEnvFile('.env.local');
const child = spawn(process.execPath, ['scripts/check-integration.mjs'], { stdio: 'inherit', env: { ...process.env, APP_MODE: 'local', APP_URL: 'http://127.0.0.1:3100', MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr', MONGODB_DB: 'enterpriseqr_qa' } });
child.on('exit', code => process.exit(code || 0));
