'use client';
import { useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, Gift, MessageSquare, Plus, QrCode, ScanLine, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button, PageHeading } from '@/components/ui';
import CampaignTable from '@/components/CampaignTable';
import { campaigns, currency, number } from '@/lib/demo';

const totals = campaigns.reduce((a, c) => ({ scans: a.scans + c.scans, submissions: a.submissions + c.submissions, rewards: a.rewards + c.rewards, spent: a.spent + c.spent }), { scans: 0, submissions: 0, rewards: 0, spent: 0 });
const chartValues = [18, 28, 23, 38, 32, 24, 30, 45, 38, 27, 42, 56, 48, 36, 42, 50, 72, 58, 46, 64, 81, 68, 60, 72, 92, 80, 65, 87];

export default function Overview() {
  const [range, setRange] = useState('month');
  const [notice, setNotice] = useState('');
  function exportReport() {
    const content = ['Sample data — EnterpriseQR foundation preview', 'Metric,Value', `Scans,${totals.scans}`, `Submissions,${totals.submissions}`, `Rewards,${totals.rewards}`, `Spend NGN,${totals.spent}`].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'enterpriseqr-demo-summary.csv'; a.click(); URL.revokeObjectURL(url); setNotice('Sample summary exported.');
  }
  return <>
    <PageHeading eyebrow="YOUR ENGAGEMENT, AT A GLANCE" title="Every connection counts." description="Welcome back. Here’s what’s happening across your campaigns."><Button variant="secondary" onClick={exportReport}><ArrowDownToLine size={16} />Export summary</Button><Button href="/dashboard/campaigns/new"><Plus size={17} />Create campaign</Button></PageHeading>
    <div className="intro-banner"><div><span className="banner-kicker"><span /> BUILT FOR MEANINGFUL MOMENTS</span><h2>One scan. So many possibilities.</h2><p>Turn everyday interactions into feedback, loyalty and a little delight.</p><Link href="/q/weekend">Try the participant experience <ArrowUpRight size={17} /></Link></div><div className="banner-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="qr-tile"><QrCode size={76} strokeWidth={1.4} /></div><span className="floating-label label-top"><MessageSquare size={14} /> Listen</span><span className="floating-label label-bottom"><Gift size={14} /> Reward</span><Sparkles className="art-sparkle" size={23} /></div></div>
    <div className="section-label"><h2>Workspace snapshot</h2><span>All sample campaigns · September 2026</span></div>
    <div className="stats-grid">{[[ScanLine, 'Total scans', number(totals.scans), 'Visits to campaign pages'], [MessageSquare, 'Submissions', number(totals.submissions), 'Feedback, entries and claims'], [Gift, 'Rewards delivered', number(totals.rewards), 'Simulated successful rewards'], [QrCode, 'Reward spend', currency(totals.spent), 'Simulated settled spend']].map(([Icon, label, value, detail]) => <section className="stat-card" key={label}><div><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{detail}</small></section>)}</div>
    <div className="insights-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Engagement over time</h2><p>Illustrative scan activity · sample series</p></div><select aria-label="Chart period" value={range} onChange={e => setRange(e.target.value)}><option value="month">Last 28 days</option><option value="week">Last 7 days</option></select></div><div className="chart-legend"><span /> QR page visits <small>Illustrative daily index</small></div><div className="bar-chart" role="img" aria-label={`Illustrative scan activity for ${range === 'month' ? '28' : '7'} days. Relative index from 0 to 100, not actual scan counts.`}><div className="chart-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-bars">{(range === 'month' ? chartValues : chartValues.slice(-7)).map((value, i) => <div className="bar-column" key={i}><div style={{ height: `${value}%` }} /></div>)}</div></div><div className="chart-dates"><span>{range === 'month' ? 'Sep 01' : 'Sep 22'}</span><span>{range === 'month' ? 'Sep 07' : 'Sep 24'}</span><span>{range === 'month' ? 'Sep 14' : 'Sep 26'}</span><span>Sep 28</span></div></section>
    <section className="panel journey-panel"><div className="panel-heading"><div><h2>A connected experience</h2><p>Your participant journey</p></div><span className="tiny-icon"><ArrowUpRight size={17} /></span></div><div className="journey-step"><span><ScanLine size={19} /></span><div><strong>Start with a scan</strong><p>A branded page, ready to welcome.</p></div><span className="step-number">01</span></div><div className="journey-step"><span><MessageSquare size={19} /></span><div><strong>Make it personal</strong><p>Feedback and forms with purpose.</p></div><span className="step-number">02</span></div><div className="journey-step"><span><Gift size={19} /></span><div><strong>Give something back</strong><p>Eligible rewards, carefully managed.</p></div><span className="step-number">03</span></div><Link href="/q/weekend" className="journey-link">Walk through the demo <ArrowUpRight size={16} /></Link></section></div>
    <CampaignTable compact />
    {notice && <div className="toast" role="status"><Check size={18} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
  </>;
}
