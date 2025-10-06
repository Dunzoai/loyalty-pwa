'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type SaveButtonProps = {
  perkId: string;
  userId: string;
  initialSaved?: boolean;
  onResult?: (saved: boolean) => void;
};

export default function SaveButton({
  perkId,
  userId,
  initialSaved = false,
  onResult,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (saved) {
        // Unsave
        const { error } = await supabase
          .from('saved_perks')
          .delete()
          .eq('user_id', userId)
          .eq('perk_id', perkId);

        if (error) throw error;
        
        setSaved(false);
        onResult?.(false);
      } else {
        // Save
        const { error } = await supabase
          .from('saved_perks')
          .insert({ user_id: userId, perk_id: perkId });

        if (error) {
          // Handle unique constraint violation (already saved)
          if (error.code === '23505') {
            setSaved(true);
            onResult?.(true);
          } else {
            throw error;
          }
        } else {
          setSaved(true);
          onResult?.(true);
        }
      }
    } catch (err) {
      console.error('Save toggle error:', err);
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
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
    >
      {saved ? (
        // Filled bookmark - golden/amber color for saved
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-amber-500"
        >
          <path
            fillRule="evenodd"
            d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Outline bookmark
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-gray-600 dark:text-gray-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          />
        </svg>
      )}
    </button>
  );
}