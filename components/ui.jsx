import Link from 'next/link';

export function Button({ children, href, variant = 'primary', className = '', ...props }) {
  const classes = `button button-${variant} ${className}`;
  return href ? <Link href={href} className={classes} {...props}>{children}</Link> : <button className={classes} {...props}>{children}</button>;
}
export function Badge({ children }) { return <span className={`badge badge-${String(children).toLowerCase()}`}><span />{children}</span>; }
export function PageHeading({ eyebrow, title, description, children }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="muted">{description}</p></div><div className="heading-actions">{children}</div></div>;
}
export function EmptyState({ icon: Icon, title, children }) {
  return <div className="empty-state">{Icon && <Icon size={30} aria-hidden="true" />}<h2>{title}</h2><p className="muted">{children}</p></div>;
}
