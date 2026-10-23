'use client';
import { useId, useRef, useState } from 'react';
import { validateAnswers } from '@/lib/forms.mjs';
import { Button } from './ui';
export default function DynamicForm({ form, campaignCode, action, publicationRevision, preview = false, visitId }) {
  const prefix = useId(); const [answers, setAnswers] = useState({}); const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false); const [receipt, setReceipt] = useState(null); const requestKey = useRef(null);
  function update(id, value) { setAnswers(current => ({ ...current, [id]: value })); setErrors(current => ({ ...current, [id]: undefined, _form: undefined })); }
  async function submit(event) {
    event.preventDefault(); const checked = validateAnswers(form, answers); setErrors(checked.errors); if (Object.keys(checked.errors).length) return;
    if (preview) { setReceipt({ message: 'Preview complete. No response was stored.' }); return; }
    setBusy(true); requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/public/campaigns/${campaignCode}/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, publicationRevision, visitId, idempotencyKey: requestKey.current, answers: checked.values, website: new FormData(event.currentTarget).get('website') || '' }) });
      const result = await response.json(); if (!response.ok) { setErrors(result.fields || { _form: result.error || 'Could not send your response.' }); return; } setReceipt(result);
    } catch { setErrors({ _form: 'We could not confirm delivery. Try sending again; the same response will not be saved twice.' }); } finally { setBusy(false); }
  }
  if (receipt) return <section className="response-success" role="status"><h2>Response received</h2><p>{receipt.message}</p>{receipt.receipt && <p className="receipt-number">Reference: {receipt.receipt}</p>}<p>No airtime reward has been issued.</p></section>;
  return <form className="participant-form dynamic-form" onSubmit={submit} noValidate><h2>{form.title}</h2><p className="form-privacy">{form.privacyNotice} {form.privacyUrl && <a href={form.privacyUrl} target="_blank" rel="noopener noreferrer">Read the privacy notice</a>}</p>{preview && <p className="notice">Form preview · Responses are not saved.</p>}<fieldset disabled={busy}>{form.fields.map(field => {
    const id = `${prefix}-${field.id}`; const value = answers[field.id]; const helpId = `${id}-help`; const errorId = `${id}-error`;
    const shared = { id, name: field.id, required: field.required, 'aria-invalid': !!errors[field.id], 'aria-describedby': `${helpId} ${errorId}` };
    let control;
    if (field.type === 'consent') control = <label className="checkbox-label" htmlFor={id}><input {...shared} type="checkbox" checked={value === true} onChange={e => update(field.id, e.target.checked)} /><span>{field.label}{field.purpose === 'marketing' ? ' (optional)' : field.required ? ' *' : ''}</span></label>;
    else if (['radio', 'checkboxes'].includes(field.type)) control = <fieldset className="form-choices"><legend>{field.label}{field.required ? ' *' : ' (optional)'}</legend>{field.options.map((option, index) => <label className="checkbox-label" key={option}><input type={field.type === 'radio' ? 'radio' : 'checkbox'} name={field.id} value={option} id={`${id}-${index}`} aria-describedby={`${helpId} ${errorId}`} aria-invalid={!!errors[field.id]} checked={field.type === 'radio' ? value === option : (value || []).includes(option)} onChange={e => update(field.id, field.type === 'radio' ? option : e.target.checked ? [...(value || []), option] : (value || []).filter(v => v !== option))} />{option}</label>)}</fieldset>;
    else { const label = <label htmlFor={id}>{field.label}{field.required ? ' *' : ' (optional)'}</label>; let input;
      if (field.type === 'textarea') input = <textarea {...shared} rows={4} maxLength={field.maxLength} value={value || ''} onChange={e => update(field.id, e.target.value)} />;
      else if (['select', 'rating'].includes(field.type)) input = <select {...shared} value={value ?? ''} onChange={e => update(field.id, field.type === 'rating' && e.target.value ? Number(e.target.value) : e.target.value)}><option value="">Choose an answer</option>{(field.type === 'rating' ? Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i) : field.options).map(option => <option key={option} value={option}>{option}</option>)}</select>;
      else input = <input {...shared} type={field.type === 'phone' ? 'tel' : ['number', 'email'].includes(field.type) ? field.type : 'text'} maxLength={field.maxLength} min={field.min} max={field.max} step={field.type === 'number' ? field.integer ? 1 : 'any' : undefined} value={value ?? ''} onChange={e => update(field.id, field.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />;
      control = <>{label}{input}</>;
    }
    return <div className="dynamic-field" key={field.id}>{control}<small id={helpId}>{field.help}</small><p className="field-error" id={errorId}>{errors[field.id]}</p></div>;
  })}<label className="form-trap" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></fieldset>{errors._form && <p role="alert" className="field-error">{errors._form}</p>}{Object.values(errors).some(Boolean) && <p role="alert" className="field-error">Please check the marked fields above.</p>}<Button disabled={busy}>{busy ? 'Sending…' : preview ? 'Try preview' : 'Send response'}</Button><small>Your response goes to the organizer. Sending does not issue a reward.</small></form>;
}

