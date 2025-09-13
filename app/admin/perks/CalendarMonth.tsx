'use client';

import { useMemo, memo } from 'react';

export type Tier = 'insider' | 'founder' | 'influencer';
export type Perk = {
  id: string;
  title: string;
  active: boolean | null;
  required_card_tier: Tier;
  starts_at: string | null;
  ends_at: string | null;
};

function dayKey(d: Date) { return d.toISOString().slice(0, 10); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date) {
  const x = new Date(d);
  const weekday = x.getDay();
  x.setDate(x.getDate() - weekday);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function floorDate(dt: Date) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
function dateInRange(day: Date, start?: Date | null, end?: Date | null) {
  const s = start ? floorDate(start) : floorDate(day);
  const e = end ? floorDate(end) : (start ? floorDate(start) : floorDate(day));
  const d = floorDate(day);
  return d >= s && d <= e;
}

function CalendarMonthComponent({
  year,
  month,
  perks,
}: {
  year: number;
  month: number;
  perks: Perk[];
}) {
  const today = new Date();

  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(new Date(year, month, 1)));
    const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(first, i));

    const byDay: Record<string, Perk[]> = {};
    days.forEach((d) => { byDay[dayKey(d)] = []; });

    for (const p of perks) {
      const s = p.starts_at ? new Date(p.starts_at) : null;
      const e = p.ends_at ? new Date(p.ends_at) : null;
      for (const d of days) {
        if (dateInRange(d, s, e)) byDay[dayKey(d)].push(p);
      }
    }

    return days.map((d) => ({ date: d, items: byDay[dayKey(d)] }));
  }, [year, month, perks]);

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">{monthLabel}</div>

      <div className="grid grid-cols-7 text-xs text-gray-400">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px rounded border border-gray-700 bg-gray-700">
        {cells.map(({ date, items }) => {
          const inMonth = date.getMonth() === month;
          const todayFlag = isSameDay(date, today);
          return (
            <div
              key={dayKey(date)}
              className={`min-h-[100px] bg-black p-2 ${inMonth ? '' : 'opacity-40'} ${todayFlag ? 'ring-1 ring-blue-400' : ''}`}
            >
              <div className="text-xs mb-1 text-gray-300">{date.getDate()}</div>
              <div className="space-y-1">
                {items.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={`text-[11px] px-2 py-1 rounded border truncate
                      ${p.active ? 'border-green-700/60 bg-green-700/10' : 'border-gray-600/60 bg-gray-700/10'}`}
                    title={`${p.title} · ${p.required_card_tier}`}
                  >
                    <span className="opacity-90">{p.title}</span>
                    <span className="ml-1 opacity-60">· {p.required_card_tier}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[11px] text-gray-400">+{items.length - 3} more…</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ✅ Always export default a component function
export default memo(CalendarMonthComponent);
