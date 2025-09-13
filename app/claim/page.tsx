'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ClaimPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'idle'|'claiming'|'success'|'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const card = search.get('card');
      if (!card) { setStatus('error'); setMsg('Missing card id.'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInWithOtp({
          emailRedirectTo: window.location.origin + '/claim?card=' + card,
        });
        setStatus('error');
        setMsg('Check your email for a magic link to continue the claim.');
        return;
      }

      setStatus('claiming');
      const { data, error } = await supabase.rpc('claim_card', { card_id: card });
      if (error) { setStatus('error'); setMsg(error.message); return; }

      setStatus('success');
      setMsg(`Card claimed! Tier: ${data?.[0]?.tier ?? ''}. Redirecting…`);
      setTimeout(() => router.push('/'), 1000);
    })();
  }, [search, router]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-3">Claim your card</h1>
      {status === 'idle' && <p>Preparing…</p>}
      {status === 'claiming' && <p>Claiming…</p>}
      {status === 'success' && <p>{msg}</p>}
      {status === 'error' && <p className="text-red-600">{msg}</p>}
    </main>
  );
}
