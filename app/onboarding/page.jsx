import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { identity } from '@/lib/server/access.mjs';
import OrganizationManager from '@/components/OrganizationManager';
export default async function Onboarding() { try { await identity(await headers()); } catch (error) { if (error.status === 401) redirect('/login'); throw error; } return <main className="account-shell"><OrganizationManager /></main>; }
