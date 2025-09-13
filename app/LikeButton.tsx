// app/LikeButton.tsx
"use client";

import { useState } from "react";
import { toggleLike } from "./actions";

type Props = {
  perkId: string;
  userId: string;
  initialLiked: boolean;
  initialCount: number;
  onResult?: (liked: boolean, count: number) => void; // 👈 NEW
};

export default function LikeButton({
  perkId,
  userId,
  initialLiked,
  initialCount,
  onResult,
}: Props) {
  const [liked, setLiked] = useState<boolean>(initialLiked);
  const [count, setCount] = useState<number>(initialCount);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);

    // optimistic
    const prevLiked = liked;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    try {
      const res = await toggleLike(perkId, userId);
      if (!res?.ok) {
        // rollback
        setLiked(prevLiked);
        setCount((c) => Math.max(0, c + (prevLiked ? 1 : -1)));
        onResult?.(prevLiked, Math.max(0, count + (prevLiked ? 1 : -1)));
      } else {
        // server truth (prevents snap-back on remount)
        if (typeof res.liked === "boolean") setLiked(res.liked);
        if (typeof res.count === "number") setCount(res.count);
        onResult?.(!!res.liked, typeof res.count === "number" ? res.count : count);
      }
    } catch {
      // rollback on error
      setLiked(prevLiked);
      setCount((c) => Math.max(0, c + (prevLiked ? 1 : -1)));
      onResult?.(prevLiked, Math.max(0, count + (prevLiked ? 1 : -1)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm transition
        ${liked ? "text-green-600" : "text-gray-500 hover:text-gray-700"}
        ${busy ? "opacity-70 pointer-events-none" : ""}
      `}
      title={liked ? "Supported" : "Support"}
    >
      <span className="text-xl leading-none" aria-hidden="true">🤝</span>
      <span className="tabular-nums text-sm">{count}</span>
    </button>
  );
}
