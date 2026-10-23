'use client';
import { useState } from 'react';
import { Button } from './ui';
export function ReportFilters({ campaigns, value, onChange }) {
  return <div className="submission-filters"><label>Campaign<select value={value.campaign || ''} onChange={event => onChange('campaign', event.target.value)}><option value="">All permitted campaigns</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>From (Lagos)<input type="date" value={value.from || ''} onChange={event => onChange('from', event.target.value)} /></label><label>Through (Lagos)<input type="date" value={value.to || ''} onChange={event => onChange('to', event.target.value)} /></label></div>;
}
export function ExportButton({ kind, filters, children = 'Export CSV' }) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/reports/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, filters }) });
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a'); anchor.href = url; anchor.download = response.headers.get('content-disposition')?.match(/filename="([a-z0-9_.-]+)"/)?.[1] || 'enterpriseqr-report.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); setMessage('Export downloaded and recorded in audit history.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <span className="export-control"><Button variant="secondary" disabled={busy} onClick={download}>{busy ? 'Preparing…' : children}</Button>{message && <small role="status">{message}</small>}</span>;
}
