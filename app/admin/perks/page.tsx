'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';

// ✅ Dynamic import of CalendarMonth — no static imports anywhere.
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
};

type StatusFilter = 'all' | 'active' | 'archived';
type TierFilter = 'all' | Tier;

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

export default function AdminPerks() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Perk[]>([]);

  const [qRaw, setQRaw] = useState('');
  const [q, setQ] = useState('');
  const debounceRef = useRef<number | null>(null);

  const [status, setStatus] = useState<StatusFilter>('active');
  const [tier, setTier] = useState<TierFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [next7Only, setNext7Only] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from('Perks')
      .select('id,title,active,required_card_tier,starts_at,ends_at,business_id')
      .order('starts_at', { ascending: true, nullsFirst: true })
      .limit(1000);

    if (error) setErr(error.message);
    setRows((data as Perk[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // debounce search
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
    return list;
  }, [rows, q, status, tier, next7Only, view]);

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
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Your Perks</h1>
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
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 rounded border text-sm ${view === 'list' ? 'bg-white/10' : ''}`}
          >
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-2 rounded border text-sm ${view === 'calendar' ? 'bg-white/10' : ''}`}
          >
            Calendar
          </button>
          <Link href="/admin/perks/new" className="px-3 py-2 rounded bg-blue-600 text-white text-sm">
            + New Perk
          </Link>
        </div>
      </div>

      {view === 'list' && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            placeholder="Search perks…"
            value={qRaw}
            onChange={(e) => setQRaw(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-black/20"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-full border rounded px-3 py-2 bg-black/20"
          >
            <option value="active">Live & upcoming</option>
            <option value="archived">Hidden</option>
            <option value="all">All statuses</option>
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as TierFilter)}
            className="w-full border rounded px-3 py-2 bg-black/20"
          >
            <option value="all">All tiers</option>
            <option value="insider">Insider</option>
            <option value="influencer">Influencer</option>
            <option value="founder">Founder</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-200 border rounded px-3 py-2 bg-black/20">
            <input type="checkbox" checked={next7Only} onChange={(e) => setNext7Only(e.target.checked)} />
            Show next 7 days only
          </label>
        </div>
      )}

      {err && (
        <div className="border rounded p-4 text-sm text-red-300 mb-3">
          <div className="font-medium mb-1">Couldn’t load perks.</div>
          <div className="mb-2">{err}</div>
          <button onClick={load} className="px-3 py-1 border rounded">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : view === 'calendar' ? (
        <CalendarMonth year={y} month={m} perks={rows} />
      ) : filtered.length === 0 ? (
        <div className="border rounded p-6 text-sm text-gray-300">
          <div className="font-medium mb-1">Nothing here yet.</div>
          <div>
            Try clearing filters or click <span className="font-medium">+ New Perk</span> to create one.
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const isHidden = !p.active;
            const { label, variant } = humanStatus(p);
            return (
              <li
                key={p.id}
                className={`border rounded p-3 flex items-center gap-3 ${isHidden ? 'opacity-70' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{p.title}</div>
                    <Badge variant={variant}>{label}</Badge>
                    <Badge variant="info">{p.required_card_tier}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/perks/${p.id}/edit`} className="px-2 py-1 border rounded text-sm">
                    Edit
                  </Link>
                  {isHidden ? (
                    <button
                      onClick={() => showPerk(p.id)}
                      disabled={busyId === p.id}
                      className="px-2 py-1 border rounded text-sm disabled:opacity-60"
                    >
                      {busyId === p.id ? 'Showing…' : 'Show'}
                    </button>
                  ) : (
                    <button
                      onClick={() => hidePerk(p.id)}
                      disabled={busyId === p.id}
                      className="px-2 py-1 border rounded text-sm text-red-600 disabled:opacity-60"
                    >
                      {busyId === p.id ? 'Hiding…' : 'Hide'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
