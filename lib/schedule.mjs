// Nigeria uses UTC+01:00 year-round. Campaign availability is stored in UTC.
export function lagosToISO(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid date and time.');
  const date = new Date(`${value}:00+01:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 3600000).toISOString().slice(0, 16) !== value) throw new Error('Enter a valid calendar date.');
  return date.toISOString();
}
export function campaignState(record, now = new Date()) {
  if (record.status !== 'Published') return record.status;
  if (record.endsAt && new Date(record.endsAt) <= now) return 'Completed';
  if (record.startsAt && new Date(record.startsAt) > now) return 'Scheduled';
  return 'Active';
}
