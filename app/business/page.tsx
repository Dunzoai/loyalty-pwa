'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoiCalculator } from '@/components/RoiCalculator';

export default function BusinessLandingPage() {
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.cookie = 'sl_biz_seen=1; max-age=31536000; path=/';
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: '/business',
        page_title: 'Business Landing'
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Waitlist submission:', { email, businessName });
    setSubmitted(true);
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'generate_lead', {
        business_name: businessName
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#161B22] to-[#0B0F14]">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#E6B34D]">
            Shortlist
          </Link>
          <Link
            href="/business/login"
            className="px-4 py-2 rounded-lg bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Business Login
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4">
        <section className="py-16 md:py-24 text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-[#E6B34D]/10 border border-[#E6B34D]/20 text-[#E6B34D] text-sm font-medium mb-6">
            Not Another Loyalty Program
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Bring New Locals,<br />Not Just Punch-Card Discounts
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-10 max-w-4xl mx-auto">
            Shortlist is a network of VIP locals. Unlike POS loyalty, we don't just reward people you already have—<span className="text-[#E6B34D] font-semibold">we bring you the best customers from neighboring spots.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#pricing" className="px-8 py-4 rounded-xl bg-[#E6B34D] text-black font-bold text-lg hover:bg-[#D4A23C] transition-all">
              See Pricing
            </a>
            <a href="#waitlist" className="px-8 py-4 rounded-xl bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-colors border border-white/20">
              Join Waitlist
            </a>
          </div>
        </section>

        <section className="py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-[#E6B34D]/10 to-[#E6B34D]/5 border border-[#E6B34D]/20 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-[#E6B34D]/20 flex items-center justify-center mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Acquisition, Not Just Retention</h3>
              <p className="text-white/70">POS loyalty is closed-loop. Shortlist is cross-promoted across top local businesses.</p>
            </div>
            <div className="bg-gradient-to-br from-[#E6B34D]/10 to-[#E6B34D]/5 border border-[#E6B34D]/20 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-[#E6B34D]/20 flex items-center justify-center mb-4">
                <span className="text-3xl">👑</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">VIP, Not Coupon Traffic</h3>
              <p className="text-white/70">Members are hand-selected. This isn't Groupon—it's quality over volume.</p>
            </div>
            <div className="bg-gradient-to-br from-[#E6B34D]/10 to-[#E6B34D]/5 border border-[#E6B34D]/20 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-[#E6B34D]/20 flex items-center justify-center mb-4">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Zone Density = Results</h3>
              <p className="text-white/70">We launch zone-by-zone so every perk gets real distribution day one.</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 text-center">
              Why Toast & Square Loyalty Cost You Money
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-5xl mb-4">🔄</div>
                <h3 className="text-xl font-bold text-white mb-3">Same Faces, Lower Margin</h3>
                <p className="text-white/70">You're giving discounts to people who'd pay full price.</p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">📉</div>
                <h3 className="text-xl font-bold text-white mb-3">Zero New Customers</h3>
                <p className="text-white/70">POS loyalty only works on your existing list.</p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">💸</div>
                <h3 className="text-xl font-bold text-white mb-3">Expensive Retention</h3>
                <p className="text-white/70">You're paying to keep customers you already have.</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                Toast loyalty = retention. Shortlist = acquisition + retention.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-xl text-white/70">$200 setup, then choose your plan.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <div className="text-5xl font-bold text-[#E6B34D] mb-2">$50</div>
                <p className="text-white/60 text-sm">per month</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">2 active perks</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">25 cards/month</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#E6B34D]/20 to-[#E6B34D]/5 border-2 border-[#E6B34D] rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#E6B34D] text-black text-sm font-bold rounded-full">Most Popular</div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
                <div className="text-5xl font-bold text-[#E6B34D] mb-2">$100</div>
                <p className="text-white/60 text-sm">per month</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">4 active perks</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">50 cards/month</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-5xl font-bold text-[#E6B34D] mb-2">$200</div>
                <p className="text-white/60 text-sm">per month</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Unlimited perks</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">200 cards/month</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="waitlist" className="py-16">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-[#E6B34D]/20 to-[#E6B34D]/5 border border-[#E6B34D]/30 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">Ready to Bring New Customers?</h2>
            <p className="text-white/70 text-center mb-8 text-lg">Join the waitlist and we'll reach out to get you set up.</p>
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                <p className="text-white/70">We'll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E6B34D]"
                    placeholder="Your Restaurant or Bar"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E6B34D]"
                    placeholder="you@yourbusiness.com"
                  />
                </div>
                <button type="submit" className="w-full px-8 py-4 rounded-xl bg-[#E6B34D] text-black font-bold text-lg hover:bg-[#D4A23C] transition-all">
                  Join the Waitlist
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/20 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-[#E6B34D] mb-2">Shortlist</h3>
          <p className="text-white/60 mb-4">Not another coupon app. A curated local network.</p>
          <p className="text-white/40 text-sm">© 2025 Shortlist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}