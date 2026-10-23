import { headers } from 'next/headers';
import { pageContext as context } from '@/lib/server/page-context';
import { reportDates } from '@/lib/reporting.mjs';
import { Button } from '@/components/ui';
export default async function Audit({ searchParams }) {
  const ctx = await context(await headers());
  if (ctx.membership.role === 'manager') return <p>Audit history is available to organization administrators.</p>;
  const query = await searchParams; let dates;
  try { dates = reportDates(query); } catch { return <section className="panel account-card"><h1>Invalid date range</h1><Button href="/dashboard/audit">Reset filters</Button></section>; }
  const page = Number(query.page || 1); if (!Number.isInteger(page) || page < 1 || page > 1000) return <p>Invalid page number.</p>;
  const action = typeof query.action === 'string' ? query.action.slice(0, 100) : '';
  const filter = { organizationId: ctx.organization._id, createdAt: { $gte: dates.start, $lt: dates.end }, ...(action ? { action } : {}) };
  const [events, total] = await Promise.all([ctx.db.collection('audit').find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(50).toArray(), ctx.db.collection('audit').countDocuments(filter)]);
  const link = target => '/dashboard/audit?' + new URLSearchParams({ from: dates.from, to: dates.to, action, page: String(target) });
  return <section className="panel account-card"><h1>Audit history</h1><p>Organization changes and exports. Times are shown in Lagos.</p><form className="submission-filters"><label>From<input name="from" type="date" defaultValue={dates.from} /></label><label>Through<input name="to" type="date" defaultValue={dates.to} /></label><label>Exact action (optional)<input name="action" maxLength={100} defaultValue={action} placeholder="report.export.claims" /></label><Button>Apply filters</Button></form><p>{total} matching events</p>{events.map(e => <div className="organization-row" key={String(e._id)}><span><strong>{e.action}</strong><small>{e.resourceId}</small><small>Actor: {e.actorId}</small></span><time>{e.createdAt.toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</time></div>)}{!events.length && <p>No events match these filters.</p>}<div className="button-row">{page > 1 && <Button href={link(page - 1)} variant="secondary">Previous</Button>}<span>Page {page}</span>{page * 50 < total && <Button href={link(page + 1)} variant="secondary">Next</Button>}</div></section>;
}
