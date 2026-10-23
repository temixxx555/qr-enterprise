import DraftLoader from '@/components/DraftLoader';
export const metadata = { title: 'Edit campaign page' };
export default async function EditPage({ params }) { const { id } = await params; return <DraftLoader id={id} edit />; }
