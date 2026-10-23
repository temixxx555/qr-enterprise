import test from 'node:test';
import assert from 'node:assert/strict';
import { reportDates, csvCell, csv } from '../lib/reporting.mjs';
test('Reporting range includes both Lagos dates and rejects normalized or excessive dates', () => {
  const dates = reportDates({ from: '2026-10-02', to: '2026-10-02' });
  assert.equal(dates.start.toISOString(), '2026-10-01T23:00:00.000Z'); assert.equal(dates.end.toISOString(), '2026-10-02T23:00:00.000Z');
  for (const input of [{ from: '2026-02-30' }, { from: '2026-10-04', to: '2026-10-02' }, { from: '2020-01-01', to: '2026-01-01' }]) assert.throws(() => reportDates(input));
});
test('CSV neutralizes spreadsheet formulas and preserves quoted multiline values', () => {
  for (const value of ['=SUM(A1)', '+cmd', '-danger', '@SUM(A1)', ' \t=1', '\nhello']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"'); assert.equal(csvCell(-123), '"-123"');
  assert.equal(csv([['a', 'b'], ['x,y', 2]]), '\uFEFF"a","b"\r\n"x,y","2"\r\n');
});
