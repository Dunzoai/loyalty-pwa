'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginLanding() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChecking(false);
        return;
      }

      const { data: adminRows } = await supabase
        .from('business_admins')
        .select('business_id')
        .eq('user_id', session.user.id)
        .limit(1);

      if (adminRows && adminRows.length > 0) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/');
      }
    })();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center max-w-lg">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-lg flex items-center justify-center">
          <span className="text-2xl font-bold text-white">LOGO</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Exclusive Perks from Local Businesses
        </h1>
        <p className="text-gray-400 text-lg">
          Earn your card. Unlock the network.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => router.push('/about')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          Learn More
        </button>
        
        <div className="text-center py-2">
          <span className="text-gray-500 text-sm">or</span>
        </div>

        <button
          onClick={() => router.push('/cardholder/signin')}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors border border-gray-700"
        >
          Already Have a Card? Sign In
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/business/login')}
          className="text-gray-500 hover:text-gray-400 text-sm"
        >
          Business Login
        </button>
      </div>
    </main>
  );
}
