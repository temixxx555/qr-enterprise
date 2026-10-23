import { notFound } from 'next/navigation';
import { Building2, Gift, ShieldCheck, Settings2, Users, MessageSquare, ChartNoAxesCombined } from 'lucide-react';
import { PageHeading, EmptyState, Button } from '@/components/ui';
const sections = {
  organizations: ['Organizations', Building2, 'One workspace. Many communities.', 'Organization management is planned for Phase 2, alongside secure accounts and tenant isolation.'],
  submissions: ['Submissions', MessageSquare, 'Every response has a story.', 'Stored submissions and review tools are planned for Phase 4. The participant demo does not collect real responses.'],
  fulfillment: ['Fulfillment', Gift, 'Rewards, with a clear trail.', 'Claim processing, budget reservations and provider status are planned for Phases 6–7. No provider is connected.'],
  analytics: ['Analytics', ChartNoAxesCombined, 'Understand every connection.', 'Live analytics and filtered exports are planned for Phase 8. The overview shows saved campaign counts.'],
  team: ['Team & access', Users, 'The right access for your team.', 'Authentication, memberships and server-enforced permissions are planned for Phase 2. This preview has no private admin data.'],
  audit: ['Audit log', ShieldCheck, 'Accountability, built in.', 'Persistent administrative audit records are planned with backend implementation. No production audit events exist yet.'],
  settings: ['Settings', Settings2, 'A workspace that feels like yours.', 'Secure configuration is planned for future phases. Never enter provider credentials in this demo.'],
};
export default async function Section({ params }) {
  const { section } = await params;
  const entry = sections[section];
  if (!entry) notFound();
  const [title, Icon, subtitle, description] = entry;
  return <><PageHeading eyebrow="FOUNDATION PREVIEW" title={title} description={subtitle} /><section className="panel"><EmptyState icon={Icon} title="Coming in the next build phases">{description}</EmptyState><div className="empty-actions"><Button href="/dashboard" variant="secondary">Back to overview</Button><Button href="/dashboard/campaigns">View campaigns</Button></div></section></>;
}
