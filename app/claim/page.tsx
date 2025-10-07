'use client';
export const dynamic = 'force-dynamic';



import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ClaimPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'idle'|'needsEmail'|'emailSent'|'claiming'|'success'|'error'>('idle');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      const card = search.get('card');
      if (!card) { setStatus('error'); setMsg('Missing card id.'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('needsEmail');
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

  const handleSendMagicLink = async () => {
    const card = search.get('card');
    if (!email || !card) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/claim?card=' + card,
      }
    });

    if (error) {
      setStatus('error');
      setMsg(error.message);
    } else {
      setStatus('emailSent');
      setMsg('Check your email for a magic link to continue the claim.');
    }
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-3">Claim your card</h1>
      {status === 'idle' && <p>Preparing…</p>}
      {status === 'needsEmail' && (
        <div>
          <p className="mb-4">Enter your email to claim your card:</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="border px-3 py-2 rounded mb-3 w-full max-w-md"
          />
          <button
            onClick={handleSendMagicLink}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send Magic Link
          </button>
        </div>
      )}
      {status === 'emailSent' && <p className="text-green-600">{msg}</p>}
      {status === 'claiming' && <p>Claiming…</p>}
      {status === 'success' && <p className="text-green-600">{msg}</p>}
      {status === 'error' && <p className="text-red-600">{msg}</p>}
    </main>
  );
}
