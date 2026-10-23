'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight, Copy, Eye, LayoutTemplate, Link2, Palette, Plus, Save, Settings2, Trash2, Type, X } from 'lucide-react';
import { Button, PageHeading } from '@/components/ui';
import FormEditor from '@/components/FormEditor';
import ImageField from '@/components/ImageField';
import PageRenderer from '@/components/PageRenderer';
import { BLOCK_TYPES, createBlock, createPage, normalizePage, templates, validatePage } from '@/lib/campaign-page.mjs';


const blockNames = { text: 'Text & story', event: 'Event invitation', links: 'Website & social links', gallery: 'Photo gallery', banner: 'Image banner', announcement: 'Announcement' };
const panels = [['design', 'Identity & design', Palette], ['content', 'Page sections', Type], ['actions', 'Buttons & rewards', Settings2]];
function Field({ label, value, onChange, multiline = false, ...props }) {
  const Element = multiline ? 'textarea' : 'input';
  return <label>{label}<Element value={value || ''} onChange={e => onChange(e.target.value)} onInput={props.type === 'datetime-local' ? e => onChange(e.currentTarget.value) : undefined} {...(multiline ? { rows: 4 } : {})} {...props} /></label>;
}

function BlockEditor({ block, update }) {
  return <div className="block-editor-fields"><Field label="Section heading" value={block.title} onChange={title => update({ title })} maxLength={100} />
    {block.type === 'banner' && <><ImageField label="Section banner image" value={block.src} onChange={src => update({ src })} /><Field label="Banner description" value={block.alt} onChange={alt => update({ alt })} maxLength={200} /><Field label="Banner destination link" value={block.url} onChange={url => update({ url })} maxLength={1000} placeholder="https://… (optional)" /><Field label="Banner caption" value={block.caption} onChange={caption => update({ caption })} maxLength={300} /></>}
    {['text', 'announcement'].includes(block.type) && <Field label="Section text" value={block.body} onChange={body => update({ body })} multiline maxLength={4000} placeholder="Write in your own words. Line breaks are preserved." />}
    {block.type === 'event' && <><div className="field-pair"><Field label="Date and time" type="datetime-local" value={block.date} onChange={date => update({ date })} /><Field label="Time zone" value={block.timezone} onChange={timezone => update({ timezone })} maxLength={60} /></div><Field label="Venue" value={block.venue} onChange={venue => update({ venue })} maxLength={150} placeholder="e.g. Garden Hall" /><Field label="Address" value={block.address} onChange={address => update({ address })} maxLength={250} /><Field label="Map or event link" value={block.url} onChange={url => update({ url })} maxLength={1000} placeholder="https://…" /><Field label="Invitation details" value={block.body} onChange={body => update({ body })} multiline maxLength={2000} placeholder="Dress code, arrival information, or a personal invitation…" /></>}
    {block.type === 'links' && <>{block.items.map((link, index) => <div className="link-editor" key={link.id}><span className="item-number">{index + 1}</span><div><Field label={`Link ${index + 1} label`} value={link.label} onChange={label => update({ items: block.items.map(item => item.id === link.id ? { ...item, label } : item) })} placeholder="e.g. Instagram, My website, Event details" maxLength={80} /><Field label={`Link ${index + 1} address`} value={link.url} onChange={url => update({ items: block.items.map(item => item.id === link.id ? { ...item, url } : item) })} placeholder="https://…" maxLength={1000} /></div><button type="button" className="icon-button" aria-label={`Remove link ${index + 1}`} onClick={() => update({ items: block.items.filter(item => item.id !== link.id) })}><X size={15} /></button></div>)}<Button variant="secondary" type="button" disabled={block.items.length >= 8} onClick={() => update({ items: [...block.items, { id: crypto.randomUUID(), label: '', url: '' }] })}><Plus size={14} />Add link</Button><p className="field-help">Use full https:// links for your website, social profiles, videos or contact page. Up to 8 links per section.</p></>}
    {block.type === 'gallery' && <>{block.images.map((image, index) => <div className="gallery-editor-item" key={image.id}><ImageField label={`Gallery image ${index + 1}`} value={image.src} onChange={src => update({ images: block.images.map(item => item.id === image.id ? { ...item, src } : item) })} /><Field label={`Image ${index + 1} caption`} value={image.caption} onChange={caption => update({ images: block.images.map(item => item.id === image.id ? { ...item, caption } : item) })} maxLength={200} /><Field label={`Image ${index + 1} description`} value={image.alt} onChange={alt => update({ images: block.images.map(item => item.id === image.id ? { ...item, alt } : item) })} maxLength={200} placeholder="Describe the image for people using screen readers" /><button type="button" className="text-link" onClick={() => update({ images: block.images.filter(item => item.id !== image.id) })}><Trash2 size={13} />Remove photo slot</button></div>)}<Button type="button" variant="secondary" disabled={block.images.length >= 4} onClick={() => update({ images: [...block.images, { id: crypto.randomUUID(), src: '', caption: '', alt: '' }] })}><Plus size={14} />Add photo</Button><p className="field-help">Up to 4 photos per gallery. Images are saved with your campaign. Keep the complete page below 4 MB.</p></>}
  </div>;
}

export default function CampaignWizard({ initialPage, serverRevision }) {
  const [page, setPage] = useState(() => initialPage ? normalizePage(initialPage) : createPage('personal'));
  const [revision, setRevision] = useState(serverRevision);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState('design');
  const [expanded, setExpanded] = useState(null);
  const [dirty, setDirty] = useState(!initialPage);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [templatePicker, setTemplatePicker] = useState(!initialPage);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [preview, setPreview] = useState(false);
  const [previewAction, setPreviewAction] = useState('');
  const editVersion = useRef(0);
  const dialogRef = useRef(null);
  const templateRef = useRef(null);
  useEffect(() => {
    function warn(e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { if (preview) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [preview]);
  useEffect(() => { if (pendingTemplate) templateRef.current?.showModal(); else templateRef.current?.close(); }, [pendingTemplate]);
  function update(changes) { editVersion.current++; setPage(p => ({ ...p, ...(typeof changes === 'function' ? changes(p) : changes) })); setDirty(true); setNotice(''); }
  function updateBlock(id, changes) { update(current => ({ blocks: current.blocks.map(b => b.id === id ? { ...b, ...changes } : b) })); }
  function moveBlock(index, direction) {
    const blocks = [...page.blocks]; const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]]; update({ blocks });
  }
  function applyTemplate(id) {
    editVersion.current++;
    const next = createPage(id);
    setPage({ ...next, ...(page.id ? { id: page.id, createdAt: page.createdAt } : {}) });
    setDirty(true); setTemplatePicker(false); setPendingTemplate(null); setExpanded(null); setNotice('Template applied. Every section is yours to change.'); setErrors([]);
  }
  async function save() {
    const problems = validatePage(page); setErrors(problems);
    if (problems.length) { setNotice(''); return; }
    setSaving(true);
    const savedVersion = editVersion.current;
    try {
      const response = await fetch(revision ? `/api/campaigns/${page.id}` : '/api/campaigns', { method: revision ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', revision, page }) });
      const record = await response.json();
      if (!response.ok) throw new Error(record.error);
      setRevision(record.revision);
      if (editVersion.current === savedVersion) { setPage({ ...record.draft, id: record._id }); setDirty(false); setNotice('Saved to your organization. Open publication controls when ready to publish.'); }
      else { setPage(current => ({ ...current, id: record._id })); setNotice('Previous changes saved. Your latest edits still need saving.'); }
    } catch (error) { setErrors([error.message || 'Could not save. Download a backup and try again.']); }
    finally { setSaving(false); }
  }
  async function download() {
    const portable = structuredClone(page);
    async function embed(value) { if (!value?.startsWith('/api/assets/')) return value; const response = await fetch(value); if (!response.ok) throw new Error('Could not download a photo. Try again.'); const blob = await response.blob(); return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); }
    try { portable.banner = await embed(portable.banner); portable.profile = await embed(portable.profile); for (const block of portable.blocks) { if (block.type === 'banner') block.src = await embed(block.src); if (block.type === 'gallery') for (const image of block.images) image.src = await embed(image.src); } } catch (error) { setErrors([error.message]); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...portable, status: 'Draft' }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'enterpriseqr-page-draft.json'; a.click(); URL.revokeObjectURL(url); setNotice('Draft backup downloaded.');
  }
  const previewPage = <PageRenderer page={page} onAction={action => setPreviewAction(action)}>{previewAction && <div className="notice" role="status">{page.labels[previewAction]} is enabled. Try the full page after saving to explore this demo action.</div>}</PageRenderer>;
  return <>
    <Button href="/dashboard/campaigns" variant="text"><ArrowLeft size={15} />All campaigns</Button>
    <PageHeading eyebrow="A PAGE THAT’S UNIQUELY YOURS" title={initialPage ? 'Edit your campaign page' : 'Create your campaign page'} description="Your photos. Your story. Your invitation to connect."><Button variant="secondary" onClick={() => setPreview(true)}><Eye size={16} />Preview page</Button><Button disabled={saving} onClick={save}><Save size={16} />Save draft</Button></PageHeading>
    <div className="builder-status"><span className="builder-mode">ORGANIZATION DRAFT</span><span>{dirty ? 'Unsaved changes' : 'Saved to your organization'}</span><span className="builder-status-right">Not published · No live rewards</span></div>
    {errors.length > 0 && <div className="builder-errors" role="alert"><strong>Please check your page</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul><button className="text-link" onClick={download}>Download a backup</button></div>}
    {notice && <div className="builder-notice" role="status"><Check size={16} />{notice}</div>}
    {revision && !dirty && <Button className="saved-page-link" variant="secondary" href={`/dashboard/campaigns/${page.id}`}><Link2 size={15} />Publication & QR</Button>}
    <div className="template-bar"><div><LayoutTemplate size={19} /><span><strong>{templates.find(t => t.id === page.template)?.name || 'Custom page'}</strong><small>A starting point, ready to make your own.</small></span></div><button type="button" className="text-link" aria-expanded={templatePicker} onClick={() => setTemplatePicker(!templatePicker)}>{templatePicker ? 'Hide templates' : 'Change template'}<ChevronRight size={15} /></button></div>
    {templatePicker && <section className="template-grid" aria-label="Page templates">{templates.map(template => <button className={`template-choice template-${template.id} ${page.template === template.id ? 'chosen' : ''}`} key={template.id} onClick={() => setPendingTemplate(template.id)}><span className="template-art"><span /><i /><b /></span><small>{template.tag}</small><strong>{template.name}</strong><p>{template.detail}</p><span className="template-select">{page.template === template.id ? 'Current template' : 'Use this template'}<ChevronRight size={14} /></span></button>)}</section>}
    <div className="page-builder-grid"><section className="panel builder-controls"><nav className="builder-tabs" aria-label="Page editor">{panels.map(([id, label, Icon]) => <button key={id} onClick={() => setPanel(id)} aria-pressed={panel === id} className={panel === id ? 'active' : ''}><Icon size={16} /><span>{label}</span></button>)}</nav><div className="builder-fields">
      {panel === 'design' && <><div className="editor-section-title"><h2>Make a first impression.</h2><p>A face, a cover and a few words that feel like you.</p></div><Field label="Person or organization name" value={page.organization} onChange={organization => update({ organization })} maxLength={100} /><Field label="Page title" value={page.name} onChange={name => update({ name })} maxLength={120} /><Field label="Short tagline" value={page.tagline} onChange={tagline => update({ tagline })} maxLength={80} /><Field label="Introduction" value={page.description} onChange={description => update({ description })} multiline maxLength={1500} /><div className="editor-divider" /><ImageField label="Cover banner" value={page.banner} onChange={banner => update({ banner })} />{page.banner && <><Field label="Banner image description" value={page.bannerAlt} onChange={bannerAlt => update({ bannerAlt })} maxLength={200} /><label>Banner crop position<input type="range" min="0" max="100" value={page.bannerPosition} onChange={e => update({ bannerPosition: Number(e.target.value) })} /><small>Move the image up or down in the banner.</small></label></>}<ImageField label="Profile photo or logo" value={page.profile} onChange={profile => update({ profile })} />{page.profile && <Field label="Profile image description" value={page.profileAlt} onChange={profileAlt => update({ profileAlt })} maxLength={200} />}<Field label="Main website link" value={page.website} onChange={website => update({ website })} placeholder="https://your-website.com" maxLength={1000} /><div className="editor-divider" /><h3 className="editor-subheading">Set the mood</h3><div className="field-pair"><label>Accent colour<input type="color" value={page.color} onChange={e => update({ color: e.target.value })} /></label><label>Page background<select value={page.theme} onChange={e => update({ theme: e.target.value })}><option value="paper">Soft paper</option><option value="rose">Blush rose</option><option value="sky">Quiet blue</option><option value="sand">Warm sand</option></select></label></div><div className="field-pair"><label>Heading style<select value={page.font} onChange={e => update({ font: e.target.value })}><option value="editorial">Editorial · Serif</option><option value="modern">Modern · Sans serif</option></select></label><label>Header alignment<select value={page.alignment} onChange={e => update({ alignment: e.target.value })}><option value="left">Left aligned</option><option value="center">Centred</option></select></label></div><p className="field-help">Photos are validated and stored privately when you save. Published photos become visible with your page.</p></>}
      {panel === 'content' && <><div className="editor-section-title"><h2>Build your page, section by section.</h2><p>Add a story, event, links or photos. Move sections into the order you want.</p></div><div className="block-list">{page.blocks.map((block, index) => <section className={`block-editor ${block.visible === false ? 'block-hidden' : ''}`} key={block.id}><div className="block-editor-heading"><button className="block-expander" aria-expanded={expanded === block.id} onClick={() => setExpanded(expanded === block.id ? null : block.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{block.title || blockNames[block.type]}</strong><small>{blockNames[block.type]}</small></button><div className="block-tools"><button type="button" aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => moveBlock(index, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move section ${index + 1} down`} disabled={index === page.blocks.length - 1} onClick={() => moveBlock(index, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`Duplicate section ${index + 1}`} disabled={page.blocks.length >= 12} onClick={() => { const copy = { ...structuredClone(block), id: crypto.randomUUID() }; const blocks = [...page.blocks]; blocks.splice(index + 1, 0, copy); update({ blocks }); setExpanded(copy.id); }}><Copy size={14} /></button><button type="button" aria-label={`Remove section ${index + 1}`} onClick={() => update({ blocks: page.blocks.filter(b => b.id !== block.id) })}><Trash2 size={14} /></button></div></div>{expanded === block.id && <><label className="block-visible checkbox-label"><input type="checkbox" checked={block.visible !== false} onChange={e => updateBlock(block.id, { visible: e.target.checked })} />Show this section on the page</label><BlockEditor block={block} update={changes => updateBlock(block.id, changes)} /></>}</section>)}</div><div className="add-section"><h3>Add a section <span>{page.blocks.length}/12</span></h3><div>{BLOCK_TYPES.map(type => <button type="button" key={type} disabled={page.blocks.length >= 12} onClick={() => { const block = createBlock(type, crypto.randomUUID()); update({ blocks: [...page.blocks, block] }); setExpanded(block.id); }}><Plus size={14} />{blockNames[type]}</button>)}</div></div></>}
      {panel === 'actions' && <><div className="editor-section-title"><h2>What can visitors do?</h2><p>Your page works on its own. Add only the actions you need.</p></div>{[['rsvp', 'Event RSVP', 'Let guests register their interest in attending.'], ['feedback', 'Messages & feedback', 'Invite wishes, questions or feedback.'], ['reward', 'Optional airtime reward', 'Offer a separate gift when the reward engine is connected.']].map(([id, title, detail]) => <section key={id} className="action-setting"><label className="toggle-label"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" checked={page.actions[id]} onChange={e => update({ actions: { ...page.actions, [id]: e.target.checked } })} /></label>{page.actions[id] && <><Field label={`${title} button text`} value={page.labels[id]} onChange={value => update({ labels: { ...page.labels, [id]: value } })} maxLength={65} />{id !== 'reward' && <FormEditor action={id} form={page.forms[id]} onChange={form => update({ forms: { ...page.forms, [id]: form } })} />}</>}</section>)}{page.actions.reward && <Field label="Reward information" value={page.rewardDescription} onChange={rewardDescription => update({ rewardDescription })} multiline maxLength={500} />}<div className="notice">These are page settings. Rewards require separate eligibility, budget and provider setup before going live.</div></>}
    </div><div className="builder-bottom"><button className="text-link" onClick={download}><Copy size={14} />Download backup</button><Button disabled={saving} onClick={save}><Save size={15} />Save draft</Button></div></section>
    <aside className="builder-live-preview"><div className="preview-toolbar"><span><span />LIVE PREVIEW</span><button type="button" onClick={() => setPreview(true)}><Eye size={14} />Expand</button></div><div className="preview-scroll">{previewPage}</div><p className="preview-footnote">Changes appear here as you edit. Preview links open in a new tab.</p></aside></div>
    <dialog ref={dialogRef} className="page-preview-dialog" onCancel={() => setPreview(false)} onClose={() => setPreview(false)}><div className="dialog-toolbar"><span>Full page preview · Not published</span><button type="button" className="icon-button" aria-label="Close full page preview" onClick={() => setPreview(false)}><X size={20} /></button></div>{previewPage}</dialog>
    <dialog ref={templateRef} className="template-dialog" onCancel={() => setPendingTemplate(null)} onClose={() => setPendingTemplate(null)}><h2>Start from this template?</h2><p>This replaces the current page’s content, photos and design. Saved changes stay as they were until you save again.</p><div className="button-row"><Button variant="secondary" onClick={() => setPendingTemplate(null)}>Keep my page</Button><Button onClick={() => applyTemplate(pendingTemplate)}>Use template</Button></div></dialog>
  </>;
}
