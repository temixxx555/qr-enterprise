'use client';
import { useSyncExternalStore } from 'react';
export const DRAFT_KEY = 'enterpriseqr-demo-drafts';
function subscribe(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener('enterpriseqr-drafts', callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener('enterpriseqr-drafts', callback); };
}
function snapshot() { try { return localStorage.getItem(DRAFT_KEY) || '[]'; } catch { return '[]'; } }
function serverSnapshot() { return '[]'; }
export function useDrafts() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  try { const stored = JSON.parse(raw); return Array.isArray(stored) ? stored.filter(d => d && typeof d.id === 'string' && typeof d.name === 'string') : []; } catch { return []; }
}
export function saveDraft(page) {
  // Refuse to overwrite unreadable existing data.
  const existing = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
  if (!Array.isArray(existing)) throw new Error('Invalid stored draft data');
  const now = new Date().toISOString();
  const draft = { ...page, id: page.id || crypto.randomUUID(), status: 'Draft', updatedAt: now, createdAt: page.createdAt || now };
  const index = existing.findIndex(d => d.id === draft.id);
  if (index >= 0) existing[index] = draft; else existing.push(draft);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
  window.dispatchEvent(new Event('enterpriseqr-drafts'));
  return draft;
}
