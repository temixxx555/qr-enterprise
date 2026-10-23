'use client';
import { Eye, Pencil } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useDrafts } from '@/lib/drafts';
import { templates } from '@/lib/campaign-page.mjs';
export default function LocalDrafts() {
  const drafts = useDrafts();
  if (!drafts.length) return null;
  return <section className="panel local-drafts"><div className="panel-heading"><div><h2>Earlier browser drafts</h2><p>Open a draft and save it to copy it into this organization. The original stays in this browser.</p></div></div>{drafts.map(d => <div className="draft-row" key={d.id}><div><strong>{d.name}</strong><p>{d.organization} · {templates.find(t => t.id === d.template)?.name || d.type || 'Custom page'}</p></div><div className="draft-actions"><Badge>Draft</Badge><Button href={`/dashboard/campaigns/drafts/${d.id}/edit`} variant="secondary"><Pencil size={13} />Edit</Button><Button href={`/preview/${d.id}`} variant="secondary"><Eye size={13} />Preview</Button></div></div>)}</section>;
}
