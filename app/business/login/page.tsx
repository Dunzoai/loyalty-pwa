'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function BusinessLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/admin/dashboard',
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] flex items-center justify-center px-4">
        <button
          onClick={() => router.push('/login')}
          className="absolute left-4 top-4 text-[#9AA4B2] hover:text-[#F8FAFC] transition-colors text-sm"
        >
          ← Back
        </button>

        <div className="w-full max-w-2xl">
          <div className="mx-auto mb-8 w-20 h-20">
            <Image src="/Shortlist_Logo.png" alt="The Shortlist" width={80} height={80} />
          </div>

          <div className="rounded-2xl bg-[#0F1217]/70 backdrop-blur-sm border border-[#161B22] p-8 shadow-[0_6px_24px_rgba(0,0,0,0.24)]">
            <h1 className="text-2xl font-semibold tracking-tight text-[#F8FAFC]">Check your inbox</h1>
            <p className="mt-2 text-[#9AA4B2]">
              We sent a sign-in link to <span className="text-[#F8FAFC] font-medium">{email}</span>
            </p>

            <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-green-400 text-sm">📧 Magic link sent! Click it to access your dashboard.</p>
            </div>

            <button
              onClick={() => setSent(false)}
              className="mt-4 text-[#E6B34D] hover:text-[#d4a340] text-sm transition-colors"
            >
              Use a different email
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] flex items-center justify-center px-4">
      <button
        onClick={() => router.push('/login')}
        className="absolute left-4 top-4 text-[#9AA4B2] hover:text-[#F8FAFC] transition-colors text-sm"
      >
        ← Back
      </button>

      <div className="w-full max-w-2xl">
        <div className="mx-auto mb-8 w-20 h-20">
          <Image src="/Shortlist_Logo.png" alt="The Shortlist" width={80} height={80} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#F8FAFC] mb-4">
            Your Regulars, Rewarded. Your Slow Days, Fixed.
          </h1>
          <p className="text-[#9AA4B2] text-lg leading-relaxed max-w-3xl mx-auto">
            Turn your best customers into your growth channel. We give you Shortlist Cards, a private perks feed, and zone-level distribution—without discounting your brand to the masses.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="rounded-2xl bg-[#0F1217]/70 backdrop-blur-sm border border-[#161B22] p-8 shadow-[0_6px_24px_rgba(0,0,0,0.24)]">
            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm mb-2 text-[#9AA4B2] font-semibold">
                  Business Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@business.com"
                  className="w-full rounded-xl bg-[#0F1217] border border-[#161B22] px-4 py-3 text-[#F8FAFC] placeholder:text-[#9AA4B2]/70 outline-none focus-visible:ring-2 focus-visible:ring-[#E6B34D] focus-visible:ring-offset-0 transition-all duration-150"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm" role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValidEmail || loading}
                className="w-full rounded-xl bg-[#E6B34D] text-[#0B0F14] font-semibold py-3 transition-all duration-150 hover:bg-[#d4a340] disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
