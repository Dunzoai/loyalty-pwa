'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

type SavedPerk = {
  id: string;
  perk_id: string;
  Perks: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    required_card_tier: string;
    Businesses: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
};

type Redemption = {
  id: string;
  redeemed_at: string;
  Perks: {
    title: string;
  } | null;
  Businesses: {
    name: string;
  } | null;
};

export default function CardholderDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [cardTier, setCardTier] = useState<string | null>(null);
  const [savedPerks, setSavedPerks] = useState<SavedPerk[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);
  const [stats, setStats] = useState({
    totalRedemptions: 0,
    availablePerks: 0
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      const { data: card } = await supabase
        .from('Cards')
        .select('tier')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (card) setCardTier(card.tier);

      const { data: saved } = await supabase
        .from('saved_perks')
        .select(`
          id,
          perk_id,
          Perks!inner(
            id,
            title,
            description,
            image_url,
            required_card_tier,
            Businesses!inner(name, logo_url)
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (saved) setSavedPerks(saved as SavedPerk[]);

      const { data: redemptions } = await supabase
        .from('Redemptions')
        .select(`
          id,
          redeemed_at,
          Perks!inner(title),
          Businesses!inner(name)
        `)
        .eq('user_id', session.user.id)
        .order('redeemed_at', { ascending: false })
        .limit(10);

      if (redemptions) setRecentRedemptions(redemptions as Redemption[]);

      const { count: redemptionCount } = await supabase
        .from('Redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { count: availableCount } = await supabase
        .from('Perks')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      setStats({
        totalRedemptions: redemptionCount || 0,
        availablePerks: availableCount || 0
      });

      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <p className="text-[#9AA4B2]">Loading...</p>
      </div>
    );
  }

  const tierDisplay: Record<string, string> = {
    shortlist: 'Shortlist',
    founding_shortlist: 'Founding Shortlist',
    ambassador: 'Ambassador'
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-24">
      <header className="sticky top-0 z-20 border-b border-[#161B22] bg-[#0B0F14]/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold">Your Shortlist</h1>
          {cardTier && (
            <span className="rounded-full border border-[#E6B34D]/30 px-2 py-0.5 text-xs text-[#E6B34D]">
              {tierDisplay[cardTier]}
            </span>
          )}
          <div className="ml-auto">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-3.5 py-2 transition"
            >
              Browse Perks
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'}
          </h2>
          <p className="text-[#9AA4B2]">Member since Aug 26, 2025</p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-lg">
            <div className="flex items-center gap-2 text-[#9AA4B2] text-xs mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3A86FF]" />
              Total Redemptions
            </div>
            <div className="text-2xl font-semibold">{stats.totalRedemptions}</div>
          </div>

          <div className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-lg">
            <div className="flex items-center gap-2 text-[#9AA4B2] text-xs mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#2CE8BD]" />
              Saved Perks
            </div>
            <div className="text-2xl font-semibold">{savedPerks.length}</div>
          </div>

          <div className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-lg">
            <div className="flex items-center gap-2 text-[#9AA4B2] text-xs mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#7C3AED]" />
              Available Perks
            </div>
            <div className="text-2xl font-semibold">{stats.availablePerks}</div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Saved Perks</h2>
            <Link href="/" className="text-sm text-[#3A86FF] hover:underline">Browse all</Link>
          </div>

          {savedPerks.length === 0 ? (
            <div className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-8 text-center shadow-lg">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <span className="text-[#9AA4B2] text-xl">🔖</span>
              </div>
              <p className="font-medium mb-1">No saved perks yet</p>
              <p className="text-[#9AA4B2] text-sm mb-3">Save a perk to find it fast when you're out.</p>
              <Link
                href="/"
                className="inline-flex items-center rounded-xl bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-3.5 py-2 transition"
              >
                Browse Perks
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedPerks.map((saved) => {
                const perk = saved.Perks;
                if (!perk) return null;

                return (
                  <Link
                    key={saved.id}
                    href="/"
                    className="rounded-[14px] bg-[#0F1217] border border-[#161B22] overflow-hidden shadow-lg hover:border-[#E6B34D]/30 transition-colors"
                  >
                    {perk.image_url && (
                      <div className="relative w-full aspect-[4/3]">
                        <Image
                          src={perk.image_url}
                          alt={perk.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {perk.Businesses?.logo_url && (
                          <Image
                            src={perk.Businesses.logo_url}
                            alt=""
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-xs text-[#9AA4B2]">
                          {perk.Businesses?.name || 'Local Business'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm">{perk.title}</h3>
                      {perk.description && (
                        <p className="text-xs text-[#9AA4B2] mt-1 line-clamp-2">{perk.description}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Recent Activity</h2>
          <div className="overflow-hidden rounded-[14px] border border-[#161B22] bg-[#0F1217]">
            {recentRedemptions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[#9AA4B2]">No redemptions yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#0B0F14] text-[#9AA4B2]">
                  <tr>
                    <th className="text-left px-4 py-3">Perk</th>
                    <th className="text-left px-4 py-3">Business</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRedemptions.map((redemption) => (
                    <tr key={redemption.id} className="border-t border-[#161B22]">
                      <td className="px-4 py-3 font-medium">{redemption.Perks?.title || 'Unknown Perk'}</td>
                      <td className="px-4 py-3 text-[#9AA4B2]">{redemption.Businesses?.name || 'Unknown Business'}</td>
                      <td className="px-4 py-3 text-[#9AA4B2]">
                        {new Date(redemption.redeemed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#2CE8BD]/15 text-[#2CE8BD] px-2 py-0.5 text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2CE8BD]" /> Redeemed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
