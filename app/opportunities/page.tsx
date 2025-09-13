'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Opp = {
  id: string;
  title: string;
  status: 'open' | 'closed' | 'paused';
  starts_at: string | null;
  ends_at: string | null;
};

export default function OpportunitiesList() {
  const [rows, setRows] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from('opportunities')
        .select('id,title,status,starts_at,ends_at')
        .eq('status', 'open')
        .order('starts_at', { ascending: false, nullsFirst: true });
      if (error) setErr(error.message);
      setRows((data ?? []) as Opp[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Open Collabs</h1>
      {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
      {loading ? <p>Loading…</p> : rows.length === 0 ? <p>No opportunities right now.</p> : (
        <ul className="space-y-2">
          {rows.map(o => (
            <li key={o.id} className="border rounded p-3 bg-white flex items-center justify-between">
              <div>
                <div className="font-medium">{o.title}</div>
                <div className="text-xs text-gray-500">
                  {o.starts_at ? `Starts ${new Date(o.starts_at).toLocaleDateString()}` : 'Ongoing'}
                  {o.ends_at ? ` • Ends ${new Date(o.ends_at).toLocaleDateString()}` : ''}
                </div>
              </div>
              <Link className="px-2 py-1 border rounded text-sm" href={`/opportunities/${o.id}`}>
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
