import DraftLoader from '@/components/DraftLoader';
export const metadata = { title: 'Custom page preview' };
export default async function PreviewPage({ params }) { const { id } = await params; return <DraftLoader id={id} />; }
