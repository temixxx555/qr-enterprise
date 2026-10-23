'use client';
import { useSyncExternalStore } from 'react';
import { useDrafts } from '@/lib/drafts';
import { Button } from '@/components/ui';
import CampaignWizard from '@/components/CampaignWizard';
import Participant from '@/components/Participant';
const subscribe = () => () => {};
export default function DraftLoader({ id, edit = false }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const drafts = useDrafts();
  const draft = drafts.find(d => d.id === id);
  if (!hydrated) return <div className="loading-state" role="status">Opening your saved page…</div>;
  if (!draft) return <div className="standalone-state"><h1>This draft isn’t in this browser.</h1><p>Local previews work only in the browser where the page was saved. Hosted, shareable pages will come with publishing.</p><Button href="/dashboard/campaigns">Back to campaigns</Button></div>;
  return edit ? <CampaignWizard key={id} initialPage={draft} /> : <Participant key={id} campaign={draft} localDraft />;
}
