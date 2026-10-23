'use client';
/* eslint-disable @next/next/no-img-element -- Validated raster data URLs do not need a remote image optimizer. */
import { ArrowUpRight, CalendarDays, Gift, MapPin, MessageSquare, UserRound, Globe, Ticket } from 'lucide-react';
import { safeUrl, safeImage, textOnColor, hasBlockContent, formatEventDate } from '@/lib/campaign-page.mjs';

function PageLink({ url, children, className = '' }) {
  const href = safeUrl(url);
  return href ? <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={16} aria-hidden="true" /></a> : null;
}

export default function PageRenderer({ page, onAction, children, published = false }) {
  const color = /^#[0-9a-f]{6}$/i.test(page.color) ? page.color : '#176b50';
  const enabled = Object.entries(page.actions || {}).filter(([, enabled]) => enabled);
  const unavailable = page.status === 'Paused';
  return <article className={`microsite theme-${page.theme} font-${page.font} align-${page.alignment}`} style={{ '--page-accent': color, '--page-on-accent': textOnColor(color) }}>
    <div className={`microsite-banner ${safeImage(page.banner) ? 'has-photo' : ''}`}>
      {safeImage(page.banner) ? <img src={page.banner} alt={page.bannerAlt || ''} style={{ objectPosition: `center ${page.bannerPosition}%` }} /> : <div className="banner-pattern" aria-hidden="true"><span /><span /><span /></div>}
    </div>
    <div className="microsite-inner"><div className="microsite-profile">{safeImage(page.profile) ? <img src={page.profile} alt={page.profileAlt || page.organization || 'Profile'} /> : <UserRound size={36} aria-hidden="true" />}</div>
      <header className="microsite-intro"><p className="microsite-owner">{page.organization}</p>{page.tagline && <p className="microsite-kicker">{page.tagline}</p>}<h1>{page.name}</h1>{page.description && <p className="microsite-description">{page.description}</p>}<PageLink url={page.website} className="microsite-website"><Globe size={15} aria-hidden="true" />Visit my website</PageLink></header>
      {page.blocks.filter(hasBlockContent).map(block => <section key={block.id} className={`content-block block-${block.type}`}>
        {block.title && <h2>{block.title}</h2>}
        {['text', 'announcement'].includes(block.type) && block.body && <p className="block-copy">{block.body}</p>}
        {block.type === 'event' && <><div className="event-facts">{block.date && <p><CalendarDays size={17} aria-hidden="true" /><span><time dateTime={block.date}>{formatEventDate(block.date)}</time><small>{block.timezone || 'Africa/Lagos'}</small></span></p>}{(block.venue || block.address) && <p><MapPin size={17} aria-hidden="true" /><span>{block.venue}{block.address && <small>{block.address}</small>}</span></p>}</div>{block.body && <p className="block-copy">{block.body}</p>}<PageLink url={block.url} className="section-link">Event details / directions</PageLink></>}
        {block.type === 'banner' && <figure className="page-image-banner">{safeUrl(block.url) ? <a href={safeUrl(block.url)} target="_blank" rel="noopener noreferrer"><img src={block.src} alt={block.alt || block.title || 'Open banner link'} /></a> : <img src={block.src} alt={block.alt || ''} />}{block.caption && <figcaption>{block.caption}</figcaption>}</figure>}
        {block.type === 'links' && <div className="page-links">{(Array.isArray(block.items) ? block.items : []).map((link, i) => <PageLink key={link.id || i} url={link.url}>{link.label || 'Open link'}</PageLink>)}</div>}
        {block.type === 'gallery' && <div className="page-gallery">{(Array.isArray(block.images) ? block.images : []).filter(image => safeImage(image.src)).map((image, i) => <figure key={image.id || i}><img src={image.src} alt={image.alt || image.caption || ''} loading="lazy" />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>}
      </section>)}
      {unavailable ? <div className="notice">This campaign is paused. Participant actions are unavailable.</div> : enabled.length > 0 && <section className="microsite-actions" aria-label="Page actions">{enabled.map(([action]) => {
        const Icon = action === 'reward' ? Gift : action === 'rsvp' ? Ticket : MessageSquare;
        return <button key={action} type="button" onClick={() => onAction?.(action)}><Icon size={19} aria-hidden="true" /><span>{page.labels[action] || action}</span><ArrowUpRight size={17} aria-hidden="true" /></button>;
      })}{page.actions.reward && <p className="reward-note">{page.rewardDescription}</p>}</section>}
      {children}<footer className="microsite-footer">Made with EnterpriseQR <span>{published ? 'No live rewards' : 'Preview · No live rewards'}</span></footer>
    </div>
  </article>;
}
