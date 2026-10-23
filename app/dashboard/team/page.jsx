import { headers } from 'next/headers';
import { pageContext as context } from '@/lib/server/page-context';
import TeamManager from '@/components/TeamManager';
export default async function Team() { const ctx = await context(await headers()); if (ctx.membership.role === 'manager') return <p>Team access is managed by organization administrators.</p>; return <TeamManager />; }
