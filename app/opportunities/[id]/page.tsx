'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Opp = { id: string; title: string; description: string | null; status: 'open'|'closed'|'paused' };

export default function OpportunityDetails() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<Opp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id,title,description,status')
        .eq('id', id)
        .maybeSingle();
      if (error) setErr(error.message);
      setRow(data as Opp | null);
    })();
  }, [id]);

  function claim() {
    startTransition(async () => {
      setErr(null);
      const res = await fetch(`/opportunities/${id}/claim`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.error ?? 'claim_failed');
      } else {
        alert('Requested! Check “My claims”.');
      }
    });
  }

  if (!row) return <main className="p-6">Loading… {err && <div className="text-red-600">{err}</div>}</main>;
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">{row.title}</h1>
      <p className="mt-2 text-gray-700">{row.description ?? '—'}</p>
      <div className="mt-4 flex gap-2">
        <button
          disabled={isPending || row.status !== 'open'}
          onClick={claim}
          className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {isPending ? 'Requesting…' : 'Request spot'}
        </button>
      </div>
      {err && <div className="text-red-600 text-sm mt-3">{err}</div>}
    </main>
  );
}
