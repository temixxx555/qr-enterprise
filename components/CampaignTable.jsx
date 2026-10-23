'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { campaigns, currency, number } from '@/lib/demo';
import { Badge } from '@/components/ui';

export default function CampaignTable({ compact = false }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All campaigns');
  const filtered = campaigns.filter(c => (status === 'All campaigns' || c.status === status) && `${c.name} ${c.organization}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel campaign-panel">
    <div className="panel-heading"><div><h2>{compact ? 'Your campaigns' : 'All campaigns'} <span className="count-pill">{campaigns.length}</span></h2><p>Small moments. Meaningful engagement.</p></div>{compact && <Link href="/dashboard/campaigns" className="text-link">View all campaigns <ArrowUpRight size={15} /></Link>}</div>
    <div className="table-controls"><div className="tabs" aria-label="Filter campaigns">{['All campaigns', 'Active', 'Paused', 'Draft'].map(item => <button key={item} aria-pressed={status === item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>)}</div><label className="search-field"><Search size={16} /><input aria-label="Search campaigns" placeholder="Search campaigns…" value={query} onChange={e => setQuery(e.target.value)} /><SlidersHorizontal size={15} /></label></div>
    <div className="table-scroll"><table><thead><tr><th scope="col">Campaign</th><th scope="col">Status</th><th scope="col">Scans</th><th scope="col">Submissions</th><th scope="col">Budget used</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{filtered.map(c => <tr key={c.id}><td><Link href={`/dashboard/campaigns/${c.id}`} className="campaign-identity"><span className={`company-avatar ${c.color}`}>{c.initials}</span><span><strong>{c.name}</strong><small>{c.organization} <span>·</span> {c.type}</small></span></Link></td><td><Badge>{c.status}</Badge></td><td>{number(c.scans)}</td><td>{number(c.submissions)}</td><td>{c.budget ? <div className="budget-cell"><span>{currency(c.spent)} <small>/ {currency(c.budget)}</small></span><div className="progress-track"><span style={{ width: `${c.spent / c.budget * 100}%` }} /></div></div> : <span className="muted">No reward budget</span>}</td><td><Link href={`/dashboard/campaigns/${c.id}`} aria-label={`View ${c.name}`} className="table-arrow"><ArrowUpRight size={18} /></Link></td></tr>)}</tbody></table>{!filtered.length && <div className="table-empty">No campaigns match your search. Try another name or status.</div>}</div>
    <div className="table-footer"><span>Showing {filtered.length} of {campaigns.length} sample campaigns</span><span>All times in Lagos, Nigeria</span></div>
  </section>;
}
