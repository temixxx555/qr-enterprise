import { spawn } from 'node:child_process';
process.loadEnvFile('.env.local');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'], { stdio: 'inherit', env: { ...process.env, APP_MODE: 'local', APP_URL: 'http://127.0.0.1:3100', MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=enterpriseqr', MONGODB_DB: 'enterpriseqr_qa', NEXT_DIST_DIR: '.next-qa' } });
child.on('exit', code => process.exit(code || 0));
