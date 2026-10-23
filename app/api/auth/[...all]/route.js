import { getAuth } from '@/lib/server/auth.mjs';
export const runtime = 'nodejs';
export async function GET(request) { return (await getAuth()).handler(request); }
export async function POST(request) { return (await getAuth()).handler(request); }
