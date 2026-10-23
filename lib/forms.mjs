export const FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'checkboxes', 'rating', 'consent'];
export const WORKFLOWS = ['feedback', 'survey', 'complaint', 'rsvp'];
export function createField(type = 'text', id = 'field') {
  return { id, type, label: type === 'consent' ? 'Send me optional updates from this organizer.' : 'Your question', help: '', required: false, maxLength: type === 'textarea' ? 2000 : 200, min: type === 'rating' ? 1 : 0, max: type === 'rating' ? 5 : 100, options: ['Option 1', 'Option 2'], purpose: 'marketing' };
}
export function defaultForm(action = 'feedback') {
  const name = { ...createField('text', 'name'), label: 'Your name', required: true };
  const consent = { ...createField('consent', 'data_consent'), label: 'I agree that the organizer may use these answers to handle my response.', purpose: 'processing', required: true };
  const fields = action === 'rsvp' ? [name, { ...createField('radio', 'attendance'), label: 'Will you attend?', required: true, options: ['Yes', 'Maybe', 'No'] }, { ...createField('number', 'guests'), label: 'Number of guests (including you)', min: 1, max: 20, integer: true }, { ...createField('textarea', 'note'), label: 'A note for the organizer' }, consent] : [name, { ...createField('textarea', 'message'), label: 'Your message', required: true }, consent];
  return { schemaVersion: 1, title: action === 'rsvp' ? 'Your RSVP' : 'Leave a message', workflow: action === 'rsvp' ? 'rsvp' : 'feedback', privacyNotice: 'Your answers will be shared with this campaign’s organizer to handle your response. Optional marketing permission is separate.', privacyUrl: '', successMessage: action === 'rsvp' ? 'Your RSVP has been recorded. Thank you.' : 'Your response has been recorded. Thank you.', fields };
}
function text(value, label, max, allowEmpty = true) { if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`${label} must contain ${allowEmpty ? 'up to' : '1–'} ${max} characters.`); return value.trim(); }
export function cleanForm(input) {
  if (!input || !Array.isArray(input.fields) || input.fields.length < 1 || input.fields.length > 20) throw new Error('A form needs 1–20 fields.');
  if (!WORKFLOWS.includes(input.workflow)) throw new Error('Choose a valid form workflow.');
  const form = { schemaVersion: 1, title: text(input.title, 'Form title', 120, false), workflow: input.workflow, privacyNotice: text(input.privacyNotice, 'Privacy notice', 2000, false), privacyUrl: text(input.privacyUrl || '', 'Privacy link', 1000), successMessage: text(input.successMessage, 'Confirmation message', 500, false) };
  if (form.privacyUrl) { let url; try { url = new URL(form.privacyUrl); } catch { throw new Error('Use a complete HTTPS privacy link.'); } if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use a complete HTTPS privacy link.'); }
  const ids = new Set();
  form.fields = input.fields.map(field => {
    if (!field || !FIELD_TYPES.includes(field.type) || typeof field.id !== 'string' || !/^[a-z][a-z0-9_-]{0,60}$/.test(field.id) || ['constructor', 'prototype', 'website'].includes(field.id) || ids.has(field.id)) throw new Error('Every field needs a unique valid identifier and type.');
    ids.add(field.id);
    const item = { id: field.id, type: field.type, label: text(field.label, 'Field label', 200, false), help: text(field.help || '', 'Field help', 400), required: field.required === true };
    if (['text', 'textarea', 'email', 'phone'].includes(item.type)) { item.maxLength = field.maxLength ?? 200; if (!Number.isInteger(item.maxLength) || item.maxLength < 1 || item.maxLength > 4000) throw new Error('Text limits must be between 1 and 4000.'); }
    if (['number', 'rating'].includes(item.type)) { item.min = field.min ?? 0; item.max = field.max ?? 100; item.integer = field.type === 'rating' || field.integer === true; if (!Number.isFinite(item.min) || !Number.isFinite(item.max) || item.min < -1000000 || item.max > 1000000 || item.min > item.max) throw new Error('Choose valid numeric limits.'); if (item.type === 'rating' && (!Number.isInteger(item.min) || !Number.isInteger(item.max) || item.min !== 1 || item.max < 2 || item.max > 10)) throw new Error('Ratings must start at 1 and end between 2 and 10.'); }
    if (['select', 'radio', 'checkboxes'].includes(item.type)) { if (!Array.isArray(field.options) || field.options.length < 1 || field.options.length > 20) throw new Error('Choice fields need 1–20 options.'); item.options = field.options.map(v => text(v, 'Option', 100, false)); if (new Set(item.options).size !== item.options.length) throw new Error('Remove duplicate choices.'); }
    if (item.type === 'consent') { if (!['processing', 'marketing', 'other'].includes(field.purpose)) throw new Error('Choose a consent purpose.'); item.purpose = field.purpose; if (item.purpose === 'marketing' && item.required) throw new Error('Marketing consent must be optional.'); if (item.purpose === 'processing' && !item.required) throw new Error('Data-use consent must be required.'); }
    return item;
  });
  if (form.fields.filter(f => f.type === 'consent' && f.purpose === 'processing').length !== 1) throw new Error('Include exactly one required data-use consent field.');
  return form;
}
export function validateAnswers(form, input) {
  const errors = {}; const values = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { _form: 'Answers must be an object.' }, values };
  const known = new Set(form.fields.map(f => f.id));
  if (Object.keys(input).some(key => !known.has(key))) errors._form = 'The response contains unknown fields. Reload the page.';
  for (const field of form.fields) {
    const value = Object.hasOwn(input, field.id) ? input[field.id] : undefined;
    const fail = message => { errors[field.id] = message; };
    if (field.type === 'consent') {
      if (value !== undefined && typeof value !== 'boolean') fail('Choose yes or no.');
      else if (field.required && value !== true) fail('Your agreement is required to send this response.');
      values[field.id] = value === true; continue;
    }
    if (field.type === 'checkboxes') {
      const selected = value === undefined ? [] : value;
      if (!Array.isArray(selected) || selected.length > field.options.length || selected.some(v => typeof v !== 'string' || !field.options.includes(v)) || new Set(selected).size !== selected.length) fail('Choose from the listed options.');
      else { if (field.required && !selected.length) fail('Choose at least one option.'); values[field.id] = field.options.filter(v => selected.includes(v)); } continue;
    }
    if (value === undefined || value === '' || value === null || (typeof value === 'string' && !value.trim())) { if (field.required) fail('This field is required.'); values[field.id] = null; continue; }
    if (['number', 'rating'].includes(field.type)) { if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max || (field.integer && !Number.isInteger(value))) fail(`Enter ${field.integer ? 'a whole number' : 'a number'} from ${field.min} to ${field.max}.`); else values[field.id] = value; continue; }
    if (typeof value !== 'string') { fail('Enter a text answer.'); continue; }
    const trimmed = value.trim();
    if (['select', 'radio'].includes(field.type)) { if (!field.options.includes(trimmed)) fail('Choose one of the listed options.'); }
    else if (trimmed.length > field.maxLength) fail(`Use at most ${field.maxLength} characters.`);
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) fail('Enter a valid email address.');
    if (field.type === 'phone' && !/^\+?[0-9 ()-]{7,25}$/.test(trimmed)) fail('Enter a phone number using digits and an optional country code.');
    values[field.id] = trimmed;
  }
  return { values, errors };
}
