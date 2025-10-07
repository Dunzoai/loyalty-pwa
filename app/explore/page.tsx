'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

type Perk = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  required_card_tier: string;
  Businesses: {
    name: string;
    logo_url: string | null;
  } | null;
};

export default function ExplorePage() {
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('Perks')
        .select('id, title, description, image_url, required_card_tier, Businesses(name, logo_url)')
        .eq('active', true)
        .limit(3);

      if (error) {
        console.error('Error fetching perks:', error);
      } else {
        setPerks(data as Perk[]);
      }
      
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Loading perks...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-8">
        <button onClick={() => router.push('/about')} className="text-gray-400 hover:text-white mb-8 flex items-center">
          ← Back
        </button>
        <h1 className="text-4xl font-bold text-white mb-4">See What Members Get</h1>
        <p className="text-gray-400 text-lg">Exclusive perks from top local businesses</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 space-y-6 mb-12">
        {perks.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No perks available yet. Check back soon!</p>
        ) : (
          perks.map((perk) => (
            <div key={perk.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
              <div className="p-4 flex items-center gap-3 border-b border-gray-800">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  {perk.Businesses?.logo_url ? (
                    <Image src={perk.Businesses.logo_url} alt={perk.Businesses.name} width={40} height={40} className="rounded-lg object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">{perk.Businesses?.name?.charAt(0) || '?'}</span>
                  )}
                </div>
                <span className="text-white font-semibold">{perk.Businesses?.name || 'Local Business'}</span>
              </div>

              {perk.image_url && (
                <div className="relative w-full h-64">
                  <Image src={perk.image_url} alt={perk.title} fill className="object-cover" />
                </div>
              )}

              <div className="p-4">
                <h3 className="text-xl font-bold text-white mb-2">{perk.title}</h3>
                <p className="text-gray-400 mb-3">{perk.description || 'Exclusive member perk'}</p>
                <span className="inline-block text-xs px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full border border-blue-800">{perk.required_card_tier}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">Want Access?</h2>
            <p className="text-gray-400 mb-6">Already have a card? Sign in to unlock all exclusive perks</p>
            <button onClick={() => router.push('/cardholder/signin')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
              Sign In
            </button>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-3">Don't Have a Card Yet?</h3>
              <p className="text-gray-400 text-sm mb-4">Follow us to discover which local businesses are part of the network</p>
              
              <div className="flex justify-center gap-4">
                <a href="https://instagram.com/yourhandle" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors">
                  <span className="text-xl">📸</span>
                  <span className="font-semibold">Instagram</span>
                </a>
                
                <a href="https://twitter.com/yourhandle" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  <span className="text-xl">𝕏</span>
                  <span className="font-semibold">Twitter</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
