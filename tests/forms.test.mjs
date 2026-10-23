import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanForm, createField, defaultForm, validateAnswers, FIELD_TYPES } from '../lib/forms.mjs';
test('all ten form field types use the same validation contract', () => {
  const form = defaultForm(); form.fields = FIELD_TYPES.filter(t => t !== 'consent').map(type => ({ ...createField(type, type), required: true })); form.fields.push(defaultForm().fields.at(-1));
  const schema = cleanForm(form);
  const values = { text: 'Hello', textarea: 'A longer message', email: 'guest@example.test', phone: '+234 800 000 0000', number: 5.5, select: 'Option 1', radio: 'Option 2', checkboxes: ['Option 2'], rating: 5, data_consent: true };
  assert.deepEqual(validateAnswers(schema, values).errors, {});
  const bad = { ...values, number: '5.5', email: 'bad', phone: 'word', select: 'Other', checkboxes: ['Option 1', 'Option 1'], rating: 2.5, data_consent: 'true', unknown: 'x' };
  const errors = validateAnswers(schema, bad).errors;
  for (const key of ['number', 'email', 'phone', 'select', 'checkboxes', 'rating', 'data_consent', '_form']) assert.ok(errors[key], key);
});
test('marketing consent cannot be required, is not preselected and does not gate feedback', () => {
  const form = defaultForm(); form.fields.push({ ...createField('consent', 'marketing'), purpose: 'marketing' });
  const schema = cleanForm(form); const result = validateAnswers(schema, { name: 'Guest', message: 'Hello', data_consent: true });
  assert.deepEqual(result.errors, {}); assert.equal(result.values.marketing, false);
  form.fields.at(-1).required = true; assert.throws(() => cleanForm(form), /Marketing consent must be optional/);
  assert.ok(validateAnswers(schema, { name: 'Guest', message: 'Hello', data_consent: false }).errors.data_consent);
});
test('schema rejects duplicate IDs, malicious URLs, excessive choices and missing data consent', () => {
  const base = defaultForm();
  assert.throws(() => cleanForm({ ...base, fields: [...base.fields, base.fields[0]] }), /unique/);
  assert.throws(() => cleanForm({ ...base, fields: [{ ...base.fields[0], id: undefined }, ...base.fields.slice(1)] }), /identifier/);
  assert.throws(() => cleanForm({ ...base, privacyUrl: 'javascript:alert(1)' }), /HTTPS/);
  assert.throws(() => cleanForm({ ...base, fields: base.fields.slice(0, 2) }), /data-use/);
  assert.throws(() => cleanForm({ ...base, fields: [...base.fields, { ...createField('radio', 'choice'), options: ['one', 'one'] }] }), /duplicate/);
});
test('optional blank fields normalize without accepting objects or out-of-range answers', () => {
  const form = cleanForm(defaultForm('rsvp'));
  const valid = validateAnswers(form, { name: '  Guest  ', attendance: 'No', data_consent: true });
  assert.equal(valid.values.name, 'Guest'); assert.equal(valid.values.guests, null); assert.deepEqual(valid.errors, {});
  assert.ok(validateAnswers(form, { name: {}, attendance: 'Yes', guests: 21, data_consent: true }).errors.guests);
  assert.ok(validateAnswers(form, { name: 'Guest', attendance: 'Yes', guests: 1.5, data_consent: true }).errors.guests);
  assert.ok(validateAnswers(form, []).errors._form);
});
