export const CLAIM_STATES = ['review', 'queued', 'pending', 'unknown', 'succeeded', 'failed', 'reversed', 'rejected'];
export function reportDates(input = {}, now = new Date()) {
  const today = new Date(now.getTime() + 3600000).toISOString().slice(0, 10);
  const from = input.from || new Date(new Date(`${today}T00:00:00Z`).getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const to = input.to || today;
  for (const value of [from, to]) if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Choose valid dates.');
  const start = new Date(`${from}T00:00:00+01:00`); const end = new Date(new Date(`${to}T00:00:00+01:00`).getTime() + 86400000);
  if (end <= start || end - start > 366 * 86400000) throw new Error('Choose a date range of up to 366 days, with the end on or after the start.');
  return { from, to, start, end };
}
export function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Quote escaping protects CSV structure; the apostrophe protects spreadsheet formulas.
  if (typeof value !== 'number' && (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function csv(rows) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
