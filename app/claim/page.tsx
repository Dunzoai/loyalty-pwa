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
      if (!card) { 
        setStatus('error'); 
        setMsg('Missing card ID. Make sure you scanned a valid QR code.'); 
        return; 
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not logged in - show email input
        setStatus('needsEmail');
        return;
      }

      // Already authenticated - claim the card
      setStatus('claiming');
      const { data, error } = await supabase.rpc('claim_card', { card_id: card });
      
      if (error) { 
        setStatus('error'); 
        setMsg(error.message); 
        return; 
      }

      setStatus('success');
      setMsg(`Card claimed! Welcome to the network.`);
      setTimeout(() => router.push('/'), 2000);
    })();
  }, [search, router]);

  const handleSendMagicLink = async () => {
    const card = search.get('card');
    if (!email || !card) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/claim?card=' + card,
      },
    });

    if (error) {
      setStatus('error');
      setMsg(error.message);
    } else {
      setStatus('emailSent');
      setMsg('Check your email for a magic link to activate your card!');
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-white">🎫</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Claim Your Card</h1>
        </div>

        {status === 'idle' && (
          <p className="text-center text-gray-400">Loading...</p>
        )}

        {status === 'needsEmail' && (
          <div className="space-y-4">
            <p className="text-center text-gray-300 mb-6">Enter your email to activate your insider card and unlock exclusive perks!</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
            />
            <button
              onClick={handleSendMagicLink}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Activate Card
            </button>
          </div>
        )}

        {status === 'emailSent' && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 text-center">
            <p className="text-blue-400 font-semibold mb-2">📧 Check your email!</p>
            <p className="text-gray-300 text-sm">{msg}</p>
          </div>
        )}

        {status === 'claiming' && (
          <p className="text-center text-gray-400">Claiming your card...</p>
        )}

        {status === 'success' && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-6 text-center">
            <p className="text-green-400 font-semibold mb-2">✓ Success!</p>
            <p className="text-gray-300 text-sm">{msg}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-400 font-semibold mb-2">⚠ Error</p>
            <p className="text-gray-300 text-sm">{msg}</p>
          </div>
        )}
      </div>
    </main>
  );
}
