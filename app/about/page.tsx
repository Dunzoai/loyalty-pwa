'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0B0F14]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push('/login')}
          className="text-[#9AA4B2] hover:text-[#F8FAFC] mb-8 flex items-center transition-colors"
        >
          ← Back
        </button>

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-24 h-24 mx-auto mb-6">
            <Image src="/Shortlist_Logo.png" alt="The Shortlist" width={96} height={96} />
          </div>
          <h1 className="text-5xl font-bold text-[#F8FAFC] mb-4">
            How It Works
          </h1>
          <p className="text-xl text-[#9AA4B2]">
            A private perks network for loyal locals
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-12 mb-16">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-[#E6B34D] rounded-full flex items-center justify-center text-[#0B0F14] font-bold text-xl">
              1
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#F8FAFC] mb-3">
                Get Recognized by Your Favorite Spot
              </h3>
              <p className="text-[#9AA4B2] leading-relaxed">
                Cards aren't bought—they're handed to real regulars.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-[#E6B34D] rounded-full flex items-center justify-center text-[#0B0F14] font-bold text-xl">
              2
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#F8FAFC] mb-3">
                Unlock the Network
              </h3>
              <p className="text-[#9AA4B2] leading-relaxed">
                Your card works across multiple businesses, not just one.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-[#E6B34D] rounded-full flex items-center justify-center text-[#0B0F14] font-bold text-xl">
              3
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#F8FAFC] mb-3">
                Zone-Smart Feed
              </h3>
              <p className="text-[#9AA4B2] leading-relaxed">
                Hyper-local by default; destination perks on top.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-[#E6B34D] rounded-full flex items-center justify-center text-[#0B0F14] font-bold text-xl">
              4
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#F8FAFC] mb-3">
                12-Month Access
              </h3>
              <p className="text-[#9AA4B2] leading-relaxed">
                Stay active to stay on the Shortlist.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#161B22] my-12"></div>

        {/* What's the Shortlist tiles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#F8FAFC] mb-8 text-center">
            What's the Shortlist?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0F1217] border border-[#161B22] rounded-lg p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h4 className="text-xl font-bold text-[#F8FAFC] mb-2">Earned, Not Bought</h4>
              <p className="text-[#9AA4B2]">
                Owners hand cards to regulars who actually show up.
              </p>
            </div>

            <div className="bg-[#0F1217] border border-[#161B22] rounded-lg p-6">
              <div className="text-3xl mb-3">🌐</div>
              <h4 className="text-xl font-bold text-[#F8FAFC] mb-2">One Card, Many Spots</h4>
              <p className="text-[#9AA4B2]">
                Your Shortlist card works across the whole network.
              </p>
            </div>

            <div className="bg-[#0F1217] border border-[#161B22] rounded-lg p-6">
              <div className="text-3xl mb-3">📍</div>
              <h4 className="text-xl font-bold text-[#F8FAFC] mb-2">Zone-Smart Feed</h4>
              <p className="text-[#9AA4B2]">
                See the best near you—drive farther when it's worth it.
              </p>
            </div>

            <div className="bg-[#0F1217] border border-[#161B22] rounded-lg p-6">
              <div className="text-3xl mb-3">⏳</div>
              <h4 className="text-xl font-bold text-[#F8FAFC] mb-2">12-Month Access</h4>
              <p className="text-[#9AA4B2]">
                Cards expire. Stay active, stay on the Shortlist.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-b from-[#0F1217] to-[#0B0F14] border border-[#161B22] rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-[#F8FAFC] mb-3">
            Ready to See What's Available?
          </h3>
          <p className="text-[#9AA4B2] mb-6">
            Check out member perks or ask your favorite local spot if they're on the Shortlist
          </p>
          <button
            onClick={() => router.push('/explore')}
            className="bg-[#E6B34D] hover:bg-[#d4a340] text-[#0B0F14] font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Explore Perks
          </button>
        </div>
      </div>
    </main>
  );
}
