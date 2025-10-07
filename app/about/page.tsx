'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push('/login')}
          className="text-gray-400 hover:text-white mb-8 flex items-center"
        >
          ← Back
        </button>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            An Exclusive Network for Local Loyalists
          </h1>
          <p className="text-xl text-gray-400">
            Earn access. Unlock perks. Support local.
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-12 mb-16">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              1
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Get Recognized by Your Favorite Spot
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Cards aren't bought—they're earned. Local businesses hand them out to their most loyal customers. Think of it as a thank you for being a regular, not just another transaction.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              2
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Unlock the Network
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Your card isn't just for one business—it's your key to an entire network of local spots. Get exclusive perks, free upgrades, and VIP access at businesses you haven't even discovered yet.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              3
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Redeem & Support Local
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Every perk you redeem supports the businesses who make your city worth living in. No corporate chains. No gimmicks. Just real perks from real places.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-12"></div>

        {/* Why section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Why It's Different
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h4 className="text-xl font-bold text-white mb-2">Earned, Not Bought</h4>
              <p className="text-gray-400">
                You can't buy your way in. Cards are distributed by businesses to customers who actually show up and support them.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-3xl mb-3">🌐</div>
              <h4 className="text-xl font-bold text-white mb-2">One Card, Many Businesses</h4>
              <p className="text-gray-400">
                Your card works across the entire network. More businesses join every week.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h4 className="text-xl font-bold text-white mb-2">Actually Exclusive</h4>
              <p className="text-gray-400">
                Limited cards. Limited perks. First come, first served. No mass discounts or corporate coupon bullshit.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-3xl mb-3">💎</div>
              <h4 className="text-xl font-bold text-white mb-2">Real Value</h4>
              <p className="text-gray-400">
                Free items, VIP experiences, early access—perks that actually matter, not 10% off something nobody wants.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Ready to Get Your Card?
          </h3>
          <p className="text-gray-400 mb-6">
            Ask your favorite local business if they're part of the network. If they are, they'll hook you up.
          </p>
          <button
            onClick={() => router.push('/explore')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Explore Perks
          </button>
        </div>
      </div>
    </main>
  );
}
