'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton'; // New import
import RedeemModalLauncher from '@/app/redeem/RedeemModalLauncher';

type CardTier = 'shortlist' | 'founding_shortlist' | 'ambassador';

type Perk = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_sponsored: boolean | null;
  tags: string[] | null;
  required_card_tier: CardTier;
  active?: boolean | null;

  business_name?: string | null;
  business_logo_url?: string | null;
  image_url?: string | null;

  // viewer-specific state
  viewer_has_liked?: boolean;
  viewer_has_saved?: boolean; // New field

  // (kept for future use; unused now)
  like_count?: number;
};

export default function FeedPage() {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [cardTier, setCardTier] = useState<CardTier | null>(null);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) setErr(sessErr.message);
      setSession(session);
      if (!session) { setLoading(false); return; }

      // Run in parallel for speed
      const cardsQ = supabase
        .from('Cards')
        .select('tier, status')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      const roleQ = supabase
        .from('Users')
        .select('role')
        .eq('email', session.user.email as string)
        .maybeSingle();

      const perksQ = supabase.rpc('eligible_perks', { feed_limit: 50 });

      const [
        { data: card },
        { data: roleRow, error: roleErr },
        { data: rpcData, error: rpcErr }
      ] = await Promise.all([cardsQ, roleQ, perksQ]);

      if (card?.tier) setCardTier(card.tier as CardTier);
      setUserRole(roleErr ? 'member' : ((roleRow?.role as 'admin' | 'member' | null) ?? 'member'));

      let basePerks: Perk[] = [];
      if (rpcErr) {
        const { data: perkData, error: perkErr } = await supabase
          .from('Perks')
          .select('id,title,description,starts_at,ends_at,is_sponsored,tags,required_card_tier,active,image_url')
          .eq('active', true)
          .order('starts_at', { ascending: false })
          .limit(50);
        if (perkErr) setErr(perkErr.message);
        basePerks = (perkData as Perk[]) ?? [];
      } else {
        basePerks = (rpcData as Perk[]) ?? [];
      }

      // Fetch viewer's likes and saves
      if (basePerks.length > 0) {
        const ids = basePerks.map(p => p.id);
        
        // Fetch likes
        const { data: userLikes, error: likeErr } = await supabase
          .from('perk_likes')
          .select('perk_id')
          .eq('user_id', session.user.id)
          .in('perk_id', ids);

        // Fetch saves
        const { data: userSaves, error: saveErr } = await supabase
          .from('saved_perks')
          .select('perk_id')
          .eq('user_id', session.user.id)
          .in('perk_id', ids);

        if (likeErr) {
          console.warn('[feed] like fetch error', likeErr);
        }
        if (saveErr) {
          console.warn('[feed] save fetch error', saveErr);
        }

        const likedSet = new Set((userLikes ?? []).map(r => r.perk_id as string));
        const savedSet = new Set((userSaves ?? []).map(r => r.perk_id as string));
        
        setPerks(basePerks.map(p => ({ 
          ...p, 
          viewer_has_liked: likedSet.has(p.id),
          viewer_has_saved: savedSet.has(p.id)
        })));
      } else {
        setPerks(basePerks);
      }

      setLoading(false);
    })();
  }, []);

  if (!session) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Welcome</h1>
        <p className="mb-4">Sign in to see your perks.</p>
        <Link href="/login" className="underline">Go to login</Link>
      </main>
    );
  }

  return (
    <main className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Perks for you</h1>
          <p className="text-sm text-gray-500">
            {cardTier ? `Your tier: ${cardTier}` : 'No active card found'}
          </p>
        </div>

        {userRole === 'admin' && (
          <Link
            href="/admin/perks/new"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm shadow-sm hover:bg-blue-700"
          >
            + New Perk
          </Link>
        )}
      </div>

      {err && <p className="px-4 text-red-600 text-sm mb-3">{err}</p>}

      {loading ? (
        <div className="px-4 space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800 h-[340px]" />
          ))}
        </div>
      ) : perks.length === 0 ? (
        <p className="px-4">No perks right now.</p>
      ) : (
        <ul className="px-0 sm:px-2 md:px-0 space-y-6">
          {perks.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl shadow-md ring-1 ring-black/5 overflow-hidden bg-white dark:bg-neutral-900"
            >
              {/* Business header */}
              <div className="p-3 flex items-center gap-2">
                {p.business_logo_url ? (
                  <Image
                    src={p.business_logo_url}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-300" />
                )}
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {p.business_name ?? 'Participating Business'}
                </div>
                {p.is_sponsored && (
                  <span className="ml-auto text:[11px] uppercase text-gray-500">Sponsored</span>
                )}
              </div>

              {/* Hero image */}
              {p.image_url && (
                <div className="relative w-full aspect-[4/3] bg-neutral-100 dark:bg-neutral-800">
                  <Image
                    src={p.image_url}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 540px"
                  />
                </div>
              )}

              {/* Body */}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold leading-snug">{p.title}</h3>
                    {p.description && (
                      <p className="text-base text-neutral-700 dark:text-neutral-300 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 text-sm text-neutral-500">
                      <span>Required tier: {p.required_card_tier}</span>
                      {p.starts_at && (
                        <span className="ml-2">
                          Starts {new Date(p.starts_at).toLocaleDateString()}
                        </span>
                      )}
                      {p.ends_at && (
                        <span className="ml-2">
                          Ends {new Date(p.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {Array.isArray(p.tags) && p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-auto flex items-center gap-1">
                    <LikeButton
                      perkId={p.id}
                      userId={session.user.id}
                      initialLiked={!!p.viewer_has_liked}
                      onResult={(liked) => {
                        setPerks(prev =>
                          prev.map(row =>
                            row.id === p.id ? { ...row, viewer_has_liked: liked } : row
                          )
                        );
                      }}
                    />
                    <SaveButton
                      perkId={p.id}
                      userId={session.user.id}
                      initialSaved={!!p.viewer_has_saved}
                      onResult={(saved) => {
                        setPerks(prev =>
                          prev.map(row =>
                            row.id === p.id ? { ...row, viewer_has_saved: saved } : row
                          )
                        );
                      }}
                    />
                    <RedeemModalLauncher perkId={p.id} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}