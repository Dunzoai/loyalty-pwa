'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

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
      <main className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <p className="text-[#9AA4B2]">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center max-w-2xl">
        <div className="w-32 h-32 mx-auto mb-8">
          <Image src="/Shortlist_Logo.png" alt="The Shortlist" width={128} height={128} />
        </div>
        <h1 className="text-5xl font-bold text-[#F8FAFC] mb-4">
          The Shortlist for Loyal Locals
        </h1>
        <p className="text-[#9AA4B2] text-lg leading-relaxed">
          Cards aren't bought—they're earned. Get anointed by your favorite spots and unlock a private feed of perks across town.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => router.push('/about')}
          className="w-full bg-[#E6B34D] hover:bg-[#d4a340] text-[#0B0F14] font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          What's the Shortlist?
        </button>
        
        <button
          onClick={() => router.push('/cardholder/signin')}
          className="w-full bg-[#0F1217] hover:bg-[#161B22] text-[#F8FAFC] font-semibold py-4 px-6 rounded-lg transition-colors border border-[#161B22]"
        >
          Already on the Shortlist? Sign In
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/business/login')}
          className="text-[#9AA4B2] hover:text-[#F8FAFC] text-sm transition-colors"
        >
          Business Login
        </button>
      </div>
    </main>
  );
}
