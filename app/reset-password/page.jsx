import RecoveryForm from '@/components/RecoveryForm';
export default async function Reset({ searchParams }) { const { token } = await searchParams; return <RecoveryForm token={typeof token === 'string' ? token : undefined} />; }
