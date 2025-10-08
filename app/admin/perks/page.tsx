'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';

const CalendarMonth = dynamic(() => import('./CalendarMonth').then(m => m.default), {
  ssr: false,
});

type Tier = 'shortlist' | 'founding_shortlist' | 'ambassador';
type Perk = {
  id: string;
  title: string;
  active: boolean | null;
  required_card_tier: Tier;
  starts_at: string | null;
  ends_at: string | null;
  business_id: string;
  redemption_count?: number;
  last_redeemed_at?: string;
};

type StatusFilter = 'all' | 'active' | 'archived';
type TierFilter = 'all' | Tier;
type SortOption = 'recent' | 'popular' | 'alphabetical';

function parseTS(v: string | null) {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function humanStatus(p: Perk) {
  if (!p.active) return { label: 'Hidden', color: '#EF4444' as const, bg: 'rgba(239, 68, 68, 0.15)' as const };
  const now = Date.now();
  const s = parseTS(p.starts_at);
  const e = parseTS(p.ends_at);

  if (s && s > now) return { label: `Starts ${new Date(s).toLocaleDateString()}`, color: '#3A86FF' as const, bg: 'rgba(58, 134, 255, 0.15)' as const };
  if (e && e < now) return { label: 'Expired', color: '#9AA4B2' as const, bg: 'rgba(154, 164, 178, 0.15)' as const };
  return { label: 'Live now', color: '#2CE8BD' as const, bg: 'rgba(44, 232, 189, 0.15)' as const };
}

function getTimeAgo(dateString: string | undefined) {
  if (!dateString) return 'Never';
  
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const tierLabels: Record<Tier, string> = {
  shortlist: 'Shortlist',
  founding_shortlist: 'Founding Shortlist',
  ambassador: 'Ambassador',
};

export default function AdminPerks() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Perk[]>([]);
  const [redemptionData, setRedemptionData] = useState<Record<string, number>>({});
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [topPerk, setTopPerk] = useState<{title: string, count: number} | null>(null);

  const [qRaw, setQRaw] = useState('');
  const [q, setQ] = useState('');
  const debounceRef = useRef<number | null>(null);

  const [status, setStatus] = useState<StatusFilter>('active');
  const [tier, setTier] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [next7Only, setNext7Only] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    
    try {
      const { data: perksData, error: perksError } = await supabase
        .from('Perks')
        .select('id,title,active,required_card_tier,starts_at,ends_at,business_id')
        .order('starts_at', { ascending: true, nullsFirst: true })
        .limit(1000);
      
      if (perksError) throw new Error(perksError.message);
      
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('perk_redemptions')
        .select('id, perk_id, status, created_at, redeemed_at')
        .limit(1000);
      
      if (redemptionsError) throw new Error(redemptionsError.message);
      
      const redemptionCounts: Record<string, number> = {};
      const lastRedemptionDates: Record<string, string> = {};
      let total = 0;
      
      redemptionsData.forEach(redemption => {
        const perkId = redemption.perk_id;
        const isRedeemed = redemption.status === 'redeemed';
        
        if (isRedeemed) {
          redemptionCounts[perkId] = (redemptionCounts[perkId] || 0) + 1;
          total++;
          
          const redemptionDate = redemption.redeemed_at || redemption.created_at;
          if (redemptionDate) {
            if (!lastRedemptionDates[perkId] || redemptionDate > lastRedemptionDates[perkId]) {
              lastRedemptionDates[perkId] = redemptionDate;
            }
          }
        }
      });
      
      const enhancedPerks = (perksData as Perk[]).map((perk) => ({
        ...perk,
        redemption_count: redemptionCounts[perk.id] || 0,
        last_redeemed_at: lastRedemptionDates[perk.id] || undefined,
      }));
      
      setTotalRedemptions(total);
      
      if (enhancedPerks.length > 0) {
        const top = enhancedPerks.reduce((max, perk) => {
          if (!max || (perk.redemption_count || 0) > (max.redemption_count || 0)) {
            return perk;
          }
          return max;
        });
        
        if (top && top.redemption_count) {
          setTopPerk({ title: top.title, count: top.redemption_count });
        }
      }
      
      const dateRedemptions: Record<string, number> = {};
      redemptionsData.forEach(redemption => {
        if (redemption.status === 'redeemed' && redemption.redeemed_at) {
          const date = new Date(redemption.redeemed_at).toISOString().split('T')[0];
          dateRedemptions[date] = (dateRedemptions[date] || 0) + 1;
        }
      });
      
      setRedemptionData(dateRedemptions);
      setRows(enhancedPerks);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setQ(qRaw), 200) as unknown as number;
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [qRaw]);

  const filtered = useMemo(() => {
    let list = rows;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(needle));
    }
    if (status !== 'all') {
      const wantActive = status === 'active';
      list = list.filter((p) => (!!p.active) === wantActive);
    }
    if (tier !== 'all') list = list.filter((p) => p.required_card_tier === tier);

    if (next7Only && view === 'list') {
      const now = Date.now();
      const in7 = now + 7 * 24 * 60 * 60 * 1000;
      list = list.filter((p) => {
        if (!p.active) return false;
        const s = parseTS(p.starts_at);
        if (!s || s <= now) return true;
        return s <= in7;
      });
    }
    
    if (sortBy === 'recent') {
      list = [...list].sort((a, b) => {
        if (!a.last_redeemed_at && !b.last_redeemed_at) return 0;
        if (!a.last_redeemed_at) return 1;
        if (!b.last_redeemed_at) return -1;
        return new Date(b.last_redeemed_at).getTime() - new Date(a.last_redeemed_at).getTime();
      });
    } else if (sortBy === 'popular') {
      list = [...list].sort((a, b) => (b.redemption_count || 0) - (a.redemption_count || 0));
    } else if (sortBy === 'alphabetical') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return list;
  }, [rows, q, status, tier, next7Only, view, sortBy]);

  async function hidePerk(id: string) {
    if (!confirm('Hide this perk?')) return;
    setBusyId(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: false } : r)));
    const { error } = await supabase.from('Perks').update({ active: false }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      load();
    }
  }

  async function showPerk(id: string) {
    setBusyId(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: true } : r)));
    const { error } = await supabase.from('Perks').update({ active: true }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      load();
    }
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#111827]/95 backdrop-blur border-b border-[#161B22]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold">Your Perks</h1>
          {topPerk && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#E6B34D]/30 px-2 py-0.5 text-xs text-[#E6B34D]">
              Top: {topPerk.title} ({topPerk.count})
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-[#161B22] bg-[#0F1217] px-2.5 py-1.5 text-sm text-[#F8FAFC] hover:bg-white/5 transition-colors"
            >
              View Dashboard
            </Link>
            <Link
              href="/admin/perks/new"
              className="rounded-xl bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-3.5 py-2 transition-colors"
            >
              + New Perk
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px]">
            <input
              placeholder="Search perks"
              className="w-full rounded-xl bg-[#0F1217] border border-[#161B22] px-3.5 py-2.5 text-sm placeholder:text-[#9AA4B2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
              value={qRaw}
              onChange={(e) => setQRaw(e.target.value)}
            />
          </div>
          
          <select
            className="rounded-xl bg-[#0F1217] border border-[#161B22] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          <select
            className="rounded-xl bg-[#0F1217] border border-[#161B22] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
            value={tier}
            onChange={(e) => setTier(e.target.value as TierFilter)}
          >
            <option value="all">All Tiers</option>
            <option value="shortlist">Shortlist</option>
            <option value="founding_shortlist">Founding Shortlist</option>
            <option value="ambassador">Ambassador</option>
          </select>

          <select
            className="rounded-xl bg-[#0F1217] border border-[#161B22] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="popular">Most Redeemed</option>
            <option value="recent">Recently Used</option>
            <option value="alphabetical">A-Z</option>
          </select>

          <label className="flex items-center gap-2 rounded-xl bg-[#0F1217] border border-[#161B22] px-3 py-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={next7Only}
              onChange={(e) => setNext7Only(e.target.checked)}
              className="h-4 w-4 rounded bg-white/10 accent-[#2CE8BD] border border-[#161B22]"
            />
            <span>Next 7 days</span>
          </label>

          <button
            onClick={load}
            className="rounded-lg border border-[#161B22] bg-[#0F1217] px-2.5 py-2 text-sm hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              view === 'list'
                ? 'bg-[#E6B34D] text-[#0B0F14] font-semibold'
                : 'bg-[#0F1217] border border-[#161B22] text-[#9AA4B2] hover:text-[#F8FAFC]'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              view === 'calendar'
                ? 'bg-[#E6B34D] text-[#0B0F14] font-semibold'
                : 'bg-[#0F1217] border border-[#161B22] text-[#9AA4B2] hover:text-[#F8FAFC]'
            }`}
          >
            Calendar
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setStatus('active'); setTier('all'); }}
            className="rounded-full border border-[#161B22] bg-[#0F1217] px-3 py-1 text-xs hover:bg-white/5 transition-colors"
          >
            All Active
          </button>
          <button
            onClick={() => { setStatus('active'); setTier('founding_shortlist'); }}
            className="rounded-full border border-[#E6B34D]/30 bg-[#E6B34D]/10 text-[#E6B34D] px-3 py-1 text-xs hover:bg-[#E6B34D]/20 transition-colors"
          >
            Founding Shortlist
          </button>
          <button
            onClick={() => { setStatus('active'); setTier('shortlist'); }}
            className="rounded-full border border-[#161B22] bg-[#0F1217] px-3 py-1 text-xs hover:bg-white/5 transition-colors"
          >
            Shortlist
          </button>
          <button
            onClick={() => { setStatus('active'); setSortBy('popular'); }}
            className="rounded-full border border-[#2CE8BD]/30 bg-[#2CE8BD]/10 text-[#2CE8BD] px-3 py-1 text-xs hover:bg-[#2CE8BD]/20 transition-colors"
          >
            Most Popular
          </button>
        </div>

        {/* Error Message */}
        {err && (
          <div className="rounded-[14px] bg-[#EF4444]/10 border border-[#EF4444] p-4">
            <p className="text-[#EF4444] text-sm mb-2">{err}</p>
            <button onClick={load} className="px-3 py-1 rounded-lg border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors text-sm">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-8 text-center">
            <p className="text-[#9AA4B2]">Loading perks...</p>
          </div>
        ) : view === 'calendar' ? (
          <CalendarMonth 
            year={y} 
            month={m} 
            perks={rows}
            redemptionData={redemptionData}
          />
        ) : filtered.length === 0 ? (
          <div className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <span className="text-[#9AA4B2] text-xl">📋</span>
            </div>
            <p className="font-medium mb-1">No perks found</p>
            <p className="text-[#9AA4B2] text-sm mb-4">Try clearing filters or create your first perk</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => { setStatus('all'); setTier('all'); setQRaw(''); }}
                className="rounded-xl border border-[#161B22] bg-[#0F1217] px-3.5 py-2 text-sm hover:bg-white/5 transition-colors"
              >
                Clear Filters
              </button>
              <Link
                href="/admin/perks/new"
                className="rounded-xl bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-3.5 py-2 text-sm transition-colors"
              >
                Create Perk
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const { label, color, bg } = humanStatus(p);
              const isHidden = !p.active;
              return (
                <article
                  key={p.id}
                  className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 hover:border-[#E6B34D]/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{p.title}</h3>
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap"
                          style={{ color, backgroundColor: bg, borderColor: color + '55' }}
                        >
                          {label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E6B34D]/30 px-2 py-0.5 text-xs text-[#E6B34D]">
                          {tierLabels[p.required_card_tier]}
                        </span>
                      </div>
                      <div className="text-xs text-[#9AA4B2] flex items-center gap-3">
                        <span>👥 {p.redemption_count || 0} redemptions</span>
                        <span>Last: {getTimeAgo(p.last_redeemed_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/perks/${p.id}/edit`}
                        className="rounded-lg border border-[#161B22] bg-[#0F1217] px-2.5 py-1.5 text-sm hover:bg-white/5 transition-colors"
                      >
                        Edit
                      </Link>
                      {isHidden ? (
                        <button
                          onClick={() => showPerk(p.id)}
                          disabled={busyId === p.id}
                          className="rounded-lg border border-[#2CE8BD] text-[#2CE8BD] bg-transparent px-2.5 py-1.5 text-sm hover:bg-[#2CE8BD]/10 transition-colors disabled:opacity-50"
                        >
                          Show
                        </button>
                      ) : (
                        <button
                          onClick={() => hidePerk(p.id)}
                          disabled={busyId === p.id}
                          className="rounded-lg border border-[#EF4444] text-[#EF4444] bg-transparent px-2.5 py-1.5 text-sm hover:bg-[#EF4444]/10 transition-colors disabled:opacity-50"
                        >
                          Hide
                        </button>
                      )}
                      <Link
                        href={`/admin/perks/${p.id}/analytics`}
                        className="rounded-lg border border-[#7C3AED] text-[#7C3AED] bg-transparent px-2.5 py-1.5 text-sm hover:bg-[#7C3AED]/10 transition-colors"
                      >
                        Analytics
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
