'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const search = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // If already logged in, send them somewhere smart
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }

      // Are they an admin of any business?
      const { data: adminRows } = await supabase
        .from('business_admins')
        .select('business_id')
        .eq('user_id', session.user.id)
        .limit(1);

      const nextParam = search.get('next'); // optional ?next=/somewhere
      if (adminRows && adminRows.length > 0) {
        router.replace(nextParam || '/admin'); // owners → admin by default
      } else {
        router.replace(nextParam || '/');      // customers → feed
      }
    })().finally(() => setChecking(false));
  }, [search, router]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Preserve ?next= if present; otherwise default to /
    const next = search.get('next') || '/';
    const redirectTo = window.location.origin + (next.startsWith('/') ? next : '/');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  if (checking) {
    return <main className="p-6">Checking session…</main>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

      {sent ? (
        <p>Magic link sent. Check your email and then return here.</p>
      ) : (
        <form onSubmit={sendLink} className="space-y-3 max-w-sm">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="w-full border rounded px-3 py-2"
          />
          <button className="w-full border rounded px-3 py-2">Send magic link</button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}

      {/* Handy shortcut if they’re already logged in but landed here */}
      <div className="mt-6 space-x-4 text-sm">
        <button
          className="underline"
          onClick={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setError('No active session yet. Use the magic link above.'); return; }
            const { data: adminRows } = await supabase
              .from('business_admins')
              .select('business_id')
              .eq('user_id', session.user.id)
              .limit(1);
            router.push(adminRows && adminRows.length > 0 ? '/admin' : '/');
          }}
        >
          I’m already logged in → Go where I belong
        </button>
      </div>
    </main>
  );
}
