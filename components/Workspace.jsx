'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { ArrowUpRight, Building2, ChartNoAxesCombined, ChevronDown, CircleHelp, Gift, LayoutDashboard, Menu, MessageSquare, Plus, QrCode, Settings2, ShieldCheck, Users, X } from 'lucide-react';

const navigation = [
  ['Overview', '/dashboard', LayoutDashboard], ['Campaigns', '/dashboard/campaigns', QrCode],
  ['Organizations', '/dashboard/organizations', Building2], ['Submissions', '/dashboard/submissions', MessageSquare],
  ['Fulfillment', '/dashboard/fulfillment', Gift], ['Analytics', '/dashboard/analytics', ChartNoAxesCombined],
];
const management = [['Team & access', '/dashboard/team', Users], ['Audit log', '/dashboard/audit', ShieldCheck], ['Settings', '/dashboard/settings', Settings2]];

export default function Workspace({ children, user, organization, role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  function nav(items) { return items.map(([label, href, Icon]) => {
    const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} onClick={() => setOpen(false)} className={`nav-item ${active ? 'selected' : ''}`} aria-current={active ? 'page' : undefined}><Icon size={18} /><span>{label}</span></Link>;
  }); }
  return <div className="workspace">
    <a href="#main" className="skip-link">Skip to content</a>
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <Link href="/dashboard" className="brand"><span className="brand-mark"><QrCode size={23} /></span>Enterprise<span className="brand-light">QR</span></Link>
      <button className="mobile-close icon-button" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button>
      <div className="workspace-switch"><span className="workspace-avatar">E</span><div><strong>{organization.name}</strong><small>{role}</small></div><ChevronDown size={15} /></div>
      <p className="nav-caption">WORKSPACE</p><nav aria-label="Workspace">{nav(navigation)}</nav>
      <p className="nav-caption management">MANAGE</p><nav aria-label="Management">{nav(management)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={19} /></span><strong>A good place to start</strong><p>See how a scan becomes a meaningful connection.</p><button className="text-link" onClick={async () => { await authClient.signOut(); router.replace('/login'); router.refresh(); }}>Sign out <ArrowUpRight size={14} /></button></div><div className="profile"><span className="profile-avatar">DA</span><div><strong>{user.name}</strong><small>Signed in</small></div></div></div>
    </aside>
    <div className="workspace-body"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></button><span>Workspace</span><span className="separator">/</span><strong>{pathname.includes('/campaigns/new') ? 'New campaign' : [...navigation, ...management].find(([, href]) => (href === pathname || (href !== '/dashboard' && pathname.startsWith(href + '/'))))?.[0] || 'Campaigns'}</strong></div><div className="topbar-right"><span className="demo-pill"><span />Workspace</span><Link className="topbar-create" href="/dashboard/campaigns/new"><Plus size={16} /> Create campaign</Link></div></header>
      <main id="main" className="main-content">{children}</main><footer className="workspace-footer"><span>EnterpriseQR · Every scan starts a connection.</span><span>No live rewards</span></footer>
    </div>
  </div>;
}
