'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type LikeButtonProps = {
  perkId: string;
  userId: string;
  initialLiked?: boolean;
  onResult?: (liked: boolean) => void;
};

export default function LikeButton({
  perkId,
  userId,
  initialLiked = false,
  onResult,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('perk_likes')
          .delete()
          .eq('user_id', userId)
          .eq('perk_id', perkId);

        if (error) throw error;
        
        setLiked(false);
        onResult?.(false);
      } else {
        // Like
        const { error } = await supabase
          .from('perk_likes')
          .insert({ user_id: userId, perk_id: perkId });

        if (error) {
          // Handle unique constraint violation (already liked)
          if (error.code === '23505') {
            setLiked(true);
            onResult?.(true);
          } else {
            throw error;
          }
        } else {
          setLiked(true);
          onResult?.(true);
        }
      }
    } catch (err) {
      console.error('Like toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-2 rounded-lg transition-all ${
        loading ? 'opacity-50' : 'hover:scale-110'
      }`}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      {liked ? (
        // Filled heart - brass for brand
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-[#E6B34D]"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        // Outline heart
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-[#9AA4B2] hover:text-[#F8FAFC]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.5c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 4 3 6.015 3 8.5c0 2.21 2.042 3.606 4.735 5.655l.234.178C9.32 15.483 10.668 16.521 12 18c1.332-1.479 2.68-2.517 4.031-3.667l.234-.178C18.958 12.106 21 10.71 21 8.5z"
          />
        </svg>
      )}
    </button>
  );
}
