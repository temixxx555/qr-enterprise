import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { platformContext } from '@/lib/server/platform.mjs';
import PlatformManager from '@/components/PlatformManager';
export default async function Platform() { let ctx; try { ctx = await platformContext(await headers()); } catch (error) { if (error.status === 401) redirect('/login'); if (error.status === 403) notFound(); throw error; } await ctx.db.collection('platformAudit').insertOne({ actorId: ctx.user.id, action: 'organizations.listed', createdAt: new Date() }); const organizations = await ctx.db.collection('organizations').find({}, { projection: { name: 1, status: 1 } }).limit(200).toArray(); return <PlatformManager initial={organizations} />; }
