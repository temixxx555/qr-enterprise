import { redirect } from 'next/navigation';
import { context } from './access.mjs';
export async function pageContext(headers) {
  try { return await context(headers); } catch (error) { if (error.status === 401) redirect('/login'); if (error.status === 403) redirect('/onboarding'); throw error; }
}
