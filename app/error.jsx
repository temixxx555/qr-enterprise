'use client';
import { Button } from '@/components/ui';
export default function ErrorPage({ reset }) { return <div className="standalone-state"><h1>Something interrupted this page.</h1><p>Please try again. No reward is sent by reloading this preview.</p><Button onClick={reset}>Try again</Button></div>; }
