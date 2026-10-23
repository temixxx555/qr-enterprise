import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const required = ['APP_URL', 'MONGODB_URI', 'MONGODB_DB', 'BETTER_AUTH_SECRET', 'SMTP_HOST', 'MAIL_FROM', 'S3_BUCKET', 'S3_REGION'];
const missing = required.filter(key => !process.env[key]); const issues = [];
if (process.env.APP_MODE !== 'production') issues.push('APP_MODE must be production for a hosted app.');
try { const url = new URL(process.env.APP_URL); if (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) issues.push('APP_URL must be the final HTTPS hostname.'); } catch { issues.push('APP_URL is invalid.'); }
if ((process.env.BETTER_AUTH_SECRET || '').length < 32) issues.push('BETTER_AUTH_SECRET must contain at least 32 characters.');
if (process.env.VTPASS_SANDBOX_ENABLED === 'true') issues.push('Disable sandbox provider dispatch in a hosted production environment.');
console.log(JSON.stringify({ configurationReady: !missing.length && !issues.length, missingVariables: missing, issues, liveRewards: 'disabled', publication: 'not performed', requiredExternalChecks: ['MongoDB replica set and least-privilege account', 'SMTP delivery and password recovery', 'Private S3 upload/download', 'HTTPS domain and physical phone QR scan', 'Provider acceptance and real OTP/bot integration before live rewards', 'Hosted backup restore and monitoring destination'] }, null, 2));
if (missing.length || issues.length) process.exitCode = 1;
