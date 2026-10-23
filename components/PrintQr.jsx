'use client';
export default function PrintQr() { return <button className="button button-primary print-action" onClick={() => window.print()}>Print / Save as PDF</button>; }
