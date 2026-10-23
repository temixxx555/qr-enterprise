import { defaultForm } from './forms.mjs';
export const PAGE_VERSION = 2;
export const BLOCK_TYPES = ['text', 'event', 'links', 'gallery', 'banner', 'announcement'];
export const templates = [
  { id: 'personal', name: 'Personal page', detail: 'Your story, work and favourite links.', tag: 'YOUR OWN SPACE' },
  { id: 'birthday', name: 'Birthday & invitation', detail: 'An invitation, memories and a little gift.', tag: 'CELEBRATE TOGETHER' },
  { id: 'leader', name: 'Leader & community', detail: 'An introduction, priorities and public events.', tag: 'CONNECT WITH PEOPLE' },
  { id: 'business', name: 'Business & brand', detail: 'Introduce your business and hear from visitors.', tag: 'GROW YOUR CONNECTIONS' },
];

export function safeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

export function safeImage(value) {
  if (typeof value === 'string' && /^\/api\/assets\/[a-f0-9]{64}$/.test(value)) return value;
  return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value) && value.length < 1800000 ? value : '';
}

export function textOnColor(hex) {
  const rgb = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255) : [0.09, 0.42, 0.31];
  const linear = rgb.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .179 ? '#14231c' : '#ffffff';
}

export function createBlock(type, id = '') {
  const base = { id, type, title: '', visible: true };
  switch (type) {
    case 'event': return { ...base, title: 'You’re invited', date: '', venue: '', address: '', timezone: 'Africa/Lagos', url: '', body: '' };
    case 'links': return { ...base, title: 'Find me online', items: [{ id: `${id}-link`, label: '', url: '' }] };
    case 'gallery': return { ...base, title: 'A few favourite moments', images: [] };
    case 'banner': return { ...base, title: '', src: '', alt: '', url: '', caption: '' };
    case 'announcement': return { ...base, title: 'A note for you', body: '' };
    default: return { ...base, type: 'text', title: 'My story', body: '' };
  }
}

export function createPage(template = 'personal') {
  const page = { pageVersion: PAGE_VERSION, template, name: 'A little about me', organization: 'Your name', description: 'Welcome to my corner of the world. Here’s what I’m sharing, creating and looking forward to.', tagline: 'HELLO, AND WELCOME', color: '#176b50', theme: 'paper', font: 'editorial', alignment: 'left', banner: '', bannerAlt: '', bannerPosition: 50, profile: '', profileAlt: '', website: '', blocks: [createBlock('text', 'story'), createBlock('links', 'links')], actions: { reward: false, feedback: true, rsvp: false }, labels: { reward: 'Claim a little gift', feedback: 'Leave a message', rsvp: 'RSVP to this event' }, rewardDescription: 'An optional airtime gift, subject to campaign eligibility and availability.' };
  page.blocks[0].body = 'Share your story, your work or something that matters to you. Make this space your own.';
  if (template === 'birthday') {
    Object.assign(page, { name: 'Another year. More memories.', organization: 'The birthday celebrant', tagline: 'YOU’RE ON THE GUEST LIST', description: 'I’m celebrating another trip around the sun, and I’d love you to be part of it. Come for the laughter, stay for the memories.', color: '#964a62', theme: 'rose', alignment: 'center', blocks: [{ ...createBlock('event', 'invitation'), body: 'Add your party details here, including the dress code or anything your guests should know.' }, { ...createBlock('text', 'note'), title: 'A little birthday note', body: 'The best part of celebrating is sharing it with the people who matter. Thank you for being part of my story.' }, createBlock('gallery', 'memories')], actions: { reward: true, feedback: true, rsvp: true }, labels: { reward: 'A little airtime gift', feedback: 'Send birthday wishes', rsvp: 'Count me in · RSVP' } });
  } else if (template === 'leader') {
    Object.assign(page, { name: 'Let’s build our community.', organization: 'Your name · Your community', tagline: 'MEET YOUR CANDIDATE', description: 'A place to learn about my background, read my priorities and find upcoming public events.', color: '#315a83', theme: 'sky', blocks: [{ ...createBlock('text', 'about'), title: 'About me', body: 'Introduce yourself and your experience in your own words.' }, { ...createBlock('text', 'priorities'), title: 'My priorities', body: 'Share the issues you want to work on and the steps you propose to take.' }, createBlock('event', 'meetup'), createBlock('links', 'official-links')], actions: { reward: false, feedback: true, rsvp: true }, labels: { reward: 'Optional reward', feedback: 'Get in touch', rsvp: 'Register interest in an event' } });
  } else if (template === 'business') {
    Object.assign(page, { name: 'Good things start here.', organization: 'Your business', tagline: 'WELCOME TO OUR WORLD', description: 'Discover what we do, what’s new and how we can make your next visit special.', blocks: [{ ...createBlock('text', 'about'), title: 'What we do', body: 'Introduce your services, products and the people behind your business.' }, createBlock('gallery', 'gallery'), createBlock('links', 'links')], actions: { reward: true, feedback: true, rsvp: false } });
  }
  page.forms = { feedback: defaultForm('feedback'), rsvp: defaultForm('rsvp') };
  return page;
}

// Upgrade existing browser drafts without losing their name or welcome message.
export function normalizePage(input = {}) {
  const fallback = createPage(templates.some(t => t.id === input.template) ? input.template : 'personal');
  const page = { ...fallback, ...input };
  page.name = typeof input.name === 'string' ? input.name : fallback.name;
  page.organization = typeof input.organization === 'string' ? input.organization : fallback.organization;
  page.description = typeof input.description === 'string' ? input.description : fallback.description;
  page.color = /^#[0-9a-f]{6}$/i.test(input.color || '') ? input.color : fallback.color;
  page.theme = ['paper', 'rose', 'sky', 'sand'].includes(input.theme) ? input.theme : fallback.theme;
  page.font = input.font === 'modern' ? 'modern' : 'editorial';
  page.alignment = input.alignment === 'center' ? 'center' : 'left';
  page.bannerPosition = Number.isFinite(Number(input.bannerPosition)) ? Math.max(0, Math.min(100, Number(input.bannerPosition))) : 50;
  page.banner = safeImage(input.banner);
  page.profile = safeImage(input.profile);
  page.blocks = Array.isArray(input.blocks) ? input.blocks.filter(b => b && BLOCK_TYPES.includes(b.type)).slice(0, 12).map((block, index) => ({ ...createBlock(block.type, `block-${index}`), ...block, id: typeof block.id === 'string' ? block.id : `block-${index}`, ...(block.type === 'links' ? { items: Array.isArray(block.items) ? block.items.filter(x => x && typeof x.label === 'string' && typeof x.url === 'string').slice(0, 8) : [] } : {}), ...(block.type === 'gallery' ? { images: Array.isArray(block.images) ? block.images.filter(x => x && typeof x.src === 'string').slice(0, 4) : [] } : {}) })) : [];
  page.actions = input.pageVersion === PAGE_VERSION ? { reward: !!input.actions?.reward, feedback: !!input.actions?.feedback, rsvp: !!input.actions?.rsvp } : { reward: input.type === 'Reward claim' || input.type === 'Giveaway', feedback: true, rsvp: false };
  page.labels = { ...fallback.labels, ...(input.labels || {}) };
  page.pageVersion = PAGE_VERSION;
  page.forms = { feedback: input.forms?.feedback ?? defaultForm('feedback'), rsvp: input.forms?.rsvp ?? defaultForm('rsvp') };
  return page;
}

export function validatePage(page) {
  const errors = [];
  if (!page.name?.trim()) errors.push('Add a page title.');
  if (!page.organization?.trim()) errors.push('Add the person or organization name.');
  if (page.website?.trim() && !safeUrl(page.website)) errors.push('Use a complete http:// or https:// website link.');
  for (const block of page.blocks) {
    if (block.type === 'banner' && block.url?.trim() && !safeUrl(block.url)) errors.push('Image banners need a complete http:// or https:// destination.');
    if (block.type === 'event' && block.url?.trim() && !safeUrl(block.url)) errors.push(`“${block.title || 'Event'}” needs a valid map or event link.`);
    if (block.type === 'links') for (const link of block.items || []) {
      if ((link.label?.trim() || link.url?.trim()) && (!link.label?.trim() || !safeUrl(link.url))) errors.push('Each link needs a label and a complete http:// or https:// address.');
    }
  }
  return [...new Set(errors)];
}

export function hasBlockContent(block) {
  if (block.visible === false) return false;
  if (block.type === 'gallery') return (block.images || []).some(image => safeImage(image.src));
  if (block.type === 'banner') return !!safeImage(block.src);
  if (block.type === 'links') return (block.items || []).some(link => safeUrl(link.url));
  if (block.type === 'event') return !!(block.date || block.venue || block.address || block.body || safeUrl(block.url));
  return !!block.body?.trim();
}

export function formatEventDate(value) {
  // This value represents the organizer's wall-clock time. The adjacent timezone
  // label supplies its zone; never shift it using the visitor's local timezone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) return value || '';
  const date = new Date(`${value}:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(date);
}
