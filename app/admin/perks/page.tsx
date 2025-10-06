'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamic import of CalendarMonth
const CalendarMonth = dynamic(() => import('./CalendarMonth').then(m => m.default), {
  ssr: false,
});

type Tier = 'insider' | 'founder' | 'influencer';
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

function Badge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'danger' | 'info' | 'warning';
}) {
  const styles: Record<string, string> = {
    neutral: 'bg-gray-700/40 text-gray-200',
    success: 'bg-green-700/30 text-green-200',
    danger: 'bg-red-700/30 text-red-200',
    info: 'bg-blue-700/30 text-blue-200',
    warning: 'bg-amber-700/30 text-amber-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${styles[variant]}`}>
      {children}
    </span>
  );
}

function parseTS(v: string | null) {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function humanStatus(p: Perk) {
  if (!p.active) return { label: 'Hidden', variant: 'danger' as const };
  const now = Date.now();
  const s = parseTS(p.starts_at);
  const e = parseTS(p.ends_at);

  if (s && s > now) return { label: `Starts ${new Date(s).toLocaleDateString()}`, variant: 'warning' as const };
  if (e && e < now) return { label: `Ended ${new Date(e).toLocaleDateString()}`, variant: 'neutral' as const };
  if (e && e >= now) return { label: `Ends ${new Date(e).toLocaleDateString()}`, variant: 'success' as const };
  return { label: 'Live now', variant: 'success' as const };
}

function getTimeAgo(dateString: string | undefined) {
  if (!dateString) return 'Never';
  
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

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
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [next7Only, setNext7Only] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Load perk and redemption data
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    
    try {
      // First, fetch perks
      const { data: perksData, error: perksError } = await supabase
        .from('Perks')
        .select('id,title,active,required_card_tier,starts_at,ends_at,business_id')
        .order('starts_at', { ascending: true, nullsFirst: true })
        .limit(1000);
      
      if (perksError) {
        throw new Error(perksError.message);
      }
      
      // Then, fetch actual redemption data from perk_redemptions
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('perk_redemptions')
        .select('id, perk_id, status, created_at, redeemed_at')
        .limit(1000);
      
      if (redemptionsError) {
        throw new Error(redemptionsError.message);
      }
      
      // Process redemption data
      const redemptionCounts: Record<string, number> = {};
      const lastRedemptionDates: Record<string, string> = {};
      let total = 0;
      
      // Count redemptions by perk
      redemptionsData.forEach(redemption => {
        const perkId = redemption.perk_id;
        const isRedeemed = redemption.status === 'redeemed';
        
        // Only count redeemed status for stats
        if (isRedeemed) {
          redemptionCounts[perkId] = (redemptionCounts[perkId] || 0) + 1;
          total++;
          
          // Track last redemption date
          const redemptionDate = redemption.redeemed_at || redemption.created_at;
          if (redemptionDate) {
            if (!lastRedemptionDates[perkId] || redemptionDate > lastRedemptionDates[perkId]) {
              lastRedemptionDates[perkId] = redemptionDate;
            }
          }
        }
      });
      
      // Merge perk data with redemption data
      const enhancedPerks = (perksData as Perk[]).map((perk) => {
        return {
          ...perk,
          redemption_count: redemptionCounts[perk.id] || 0,
          last_redeemed_at: lastRedemptionDates[perk.id] || undefined,
        };
      });
      
      setTotalRedemptions(total);
      
      // Find top performing perk
      if (enhancedPerks.length > 0) {
        const top = enhancedPerks.reduce((max, perk) => {
          if (!max || (perk.redemption_count || 0) > (max.redemption_count || 0)) {
            return perk;
          }
          return max;
        });
        
        if (top && top.redemption_count) {
          setTopPerk({
            title: top.title,
            count: top.redemption_count
          });
        }
      }
      
      // Create date-based redemption data for calendar
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
      if (error instanceof Error) {
        setErr(error.message);
      } else {
        setErr('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search
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
    
    // Apply sorting
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
    <div className="min-h-screen bg-black text-gray-100">
      <main className="p-6 max-w-5xl mx-auto pb-20">
        {/* Top Navigation Bar with Dashboard Link */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>View Business Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-gray-800/70 rounded-lg text-sm">
              <span className="text-gray-400 mr-1">Total Redemptions:</span>
              <span className="font-semibold text-white">{totalRedemptions}</span>
            </div>
            {topPerk && (
              <div className="px-3 py-1 bg-gray-800/70 rounded-lg text-sm">
                <span className="text-gray-400 mr-1">Top Perk:</span>
                <span className="font-semibold text-white">{topPerk.title}</span>
                <span className="text-green-400 ml-1">({topPerk.count})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Page Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Your Perks</h1>
            <p className="text-sm text-gray-400">
              {view === 'list'
                ? (
                  <>
                    Focus: {next7Only ? 'Next 7 days' : 'All time'} ·{' '}
                    {status === 'all' ? 'All statuses' : status === 'active' ? 'Live & scheduled' : 'Hidden'}
                  </>
                )
                : (
                  <>Calendar: {new Date(y, m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</>
                )}
            </p>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 rounded border border-gray-700 text-sm transition-colors ${view === 'list' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800/50'}`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-2 rounded border border-gray-700 text-sm transition-colors ${view === 'calendar' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800/50'}`}
            >
              Calendar
            </button>
            <Link href="/admin/perks/new" className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
              + New Perk
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        {view === 'list' && (
          <div className="mb-6">
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <input
                placeholder="Search perks…"
                value={qRaw}
                onChange={(e) => setQRaw(e.target.value)}
                className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-800/50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-800/50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="active">Live & upcoming</option>
                <option value="archived">Hidden</option>
                <option value="all">All statuses</option>
              </select>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TierFilter)}
                className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-800/50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All tiers</option>
                <option value="insider">Insider</option>
                <option value="influencer">Influencer</option>
                <option value="founder">Founder</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-800/50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-200 border border-gray-700 rounded-lg px-3 py-2 bg-gray-800/50">
                <input 
                  type="checkbox" 
                  checked={next7Only} 
                  onChange={(e) => setNext7Only(e.target.checked)} 
                  className="rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                />
                Show next 7 days only
              </label>
            </div>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => { setStatus('active'); setTier('all'); }}
                className="px-3 py-1 text-xs bg-blue-900/40 text-blue-300 rounded-full hover:bg-blue-800/60 transition-colors"
              >
                All Active
              </button>
              <button 
                onClick={() => { setStatus('active'); setTier('founder'); }}
                className="px-3 py-1 text-xs bg-blue-900/40 text-blue-300 rounded-full hover:bg-blue-800/60 transition-colors"
              >
                Founder Perks
              </button>
              <button 
                onClick={() => { setStatus('active'); setTier('insider'); }}
                className="px-3 py-1 text-xs bg-amber-900/40 text-amber-300 rounded-full hover:bg-amber-800/60 transition-colors"
              >
                Insider Perks
              </button>
              <button 
                onClick={() => { setStatus('active'); setSortBy('popular'); }}
                className="px-3 py-1 text-xs bg-green-900/40 text-green-300 rounded-full hover:bg-green-800/60 transition-colors"
              >
                Most Popular
              </button>
              <button 
                onClick={() => load()}
                className="px-3 py-1 text-xs bg-gray-700/40 text-gray-300 rounded-full hover:bg-gray-600/60 transition-colors ml-auto flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {err && (
          <div className="border border-red-900 bg-red-900/20 rounded-lg p-4 text-sm text-red-300 mb-3">
            <div className="font-medium mb-1">Couldn't load perks.</div>
            <div className="mb-2">{err}</div>
            <button onClick={load} className="px-3 py-1 border border-red-700 rounded hover:bg-red-900/30 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="border border-gray-800 rounded-lg p-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]"></div>
            <p className="mt-2 text-gray-300">Loading perks...</p>
          </div>
        ) : view === 'calendar' ? (
          // Calendar View
          <CalendarMonth 
            year={y} 
            month={m} 
            perks={rows}
            redemptionData={redemptionData}
          />
        ) : filtered.length === 0 ? (
          // Empty State
          <div className="border border-gray-800 bg-gray-900/20 rounded-lg p-6 text-center text-gray-300">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="font-medium mb-1">Nothing here yet.</div>
            <div className="mb-4">
              Try clearing filters or click <span className="font-medium">+ New Perk</span> to create one.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => { setStatus('all'); setTier('all'); setQRaw(''); }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
              <Link 
                href="/admin/perks/new" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
              >
                Create New Perk
              </Link>
            </div>
          </div>
        ) : (
          // List View with Enhanced Cards
          <ul className="space-y-3">
            {filtered.map((p) => {
              const isHidden = !p.active;
              const { label, variant } = humanStatus(p);
              return (
                <li
                  key={p.id}
                  className={`border border-gray-800 rounded-lg p-4 transition-all ${isHidden ? 'bg-gray-900/30 opacity-80' : 'bg-gray-900/10 hover:bg-gray-900/30'}`}
                >
                  <div className="flex flex-wrap gap-4 items-start justify-between">
                    {/* Perk Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="font-medium text-lg text-white">{p.title}</div>
                        <Badge variant={variant}>{label}</Badge>
                        <Badge variant="info">{p.required_card_tier}</Badge>
                      </div>
                      
                      {/* Analytics Data */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-400">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className={p.redemption_count ? 'text-white' : 'text-gray-500'}>
                            {p.redemption_count || 0} redemption{p.redemption_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {p.last_redeemed_at && (
                          <div className="flex items-center">
                            <svg className="w-5 h-5 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Last redeemed: {getTimeAgo(p.last_redeemed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                      <Link 
                        href={`/admin/perks/${p.id}/edit`} 
                        className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                      >
                        Edit
                      </Link>
                      
                      {isHidden ? (
                        <button
                          onClick={() => showPerk(p.id)}
                          disabled={busyId === p.id}
                          className="px-3 py-1.5 border border-green-700 text-green-400 rounded-lg text-sm hover:bg-green-900/30 transition-colors disabled:opacity-60"
                        >
                          {busyId === p.id ? 'Showing…' : 'Show'}
                        </button>
                      ) : (
                        <button
                          onClick={() => hidePerk(p.id)}
                          disabled={busyId === p.id}
                          className="px-3 py-1.5 border border-red-700 text-red-400 rounded-lg text-sm hover:bg-red-900/30 transition-colors disabled:opacity-60"
                        >
                          {busyId === p.id ? 'Hiding…' : 'Hide'}
                        </button>
                      )}
                      
                      <Link 
                        href={`/admin/analytics?perk=${p.id}`}
                        className="px-3 py-1.5 bg-indigo-900/30 text-indigo-300 border border-indigo-800 rounded-lg text-sm hover:bg-indigo-800/30 transition-colors"
                      >
                        Analytics
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      
      {/* Fix for the white footer bar text contrast */}
      <style jsx global>{`
        /* Target the white footer bar */
        div[role="navigation"] {
          background-color: #ffffff;
        }
        
        /* Make the footer text much darker for better contrast */
        div[role="navigation"] a {
          color: #1a202c !important; /* Very dark gray, almost black */
          font-weight: 600 !important;
          font-size: 1rem !important;
          transition: color 0.2s ease;
        }
        
        div[role="navigation"] a:hover {
          color: #2563eb !important; /* Blue on hover */
        }
      `}</style>
    </div>
  );
}