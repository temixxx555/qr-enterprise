'use client';
/* eslint-disable @next/next/no-img-element -- Local image preview. */
import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

async function readImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose an image smaller than 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('This image could not be read. Please try another file.')); image.src = url; });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', .8);
    if (data.length > 1600000) throw new Error('This image is too large for this page. Try a smaller image.');
    return data;
  } finally { URL.revokeObjectURL(url); }
}

export default function ImageField({ label, value, onChange }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setError('');
    try { onChange(await readImage(file)); } catch (error) { setError(error.message); } finally { setLoading(false); e.target.value = ''; }
  }
  return <div className="image-field"><div className="image-field-heading"><strong>{label}</strong>{value && <button type="button" className="icon-button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange('')} disabled={loading}><X size={15} /></button>}</div>{value && <img className="upload-thumbnail" src={value} alt={`${label} preview`} />}<label className="upload-control"><ImagePlus size={18} /><span>{loading ? 'Preparing image…' : value ? 'Replace image' : 'Choose image'}<small>JPG, PNG or WebP · up to 8 MB</small></span><input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={loading} /></label>{error && <p role="alert" className="upload-error">{error}</p>}</div>;
}
