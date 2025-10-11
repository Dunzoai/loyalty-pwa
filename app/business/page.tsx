'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoiCalculator } from '@/components/RoiCalculator';

export default function BusinessLandingPage() {
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Mark that they've seen the business page
    document.cookie = 'sl_biz_seen=1; max-age=31536000; path=/';
    
    // Track page view
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: '/business',
        page_title: 'Business Landing'
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send to Supabase or email service
    console.log('Waitlist submission:', { email, businessName });
    setSubmitted(true);
    
    // Track conversion
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'generate_lead', {
        business_name: businessName
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#161B22] to-[#0B0F14]">
      {/* Header */}
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
        {/* Hero Section */}
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
            
              href="#pricing"
              className="px-8 py-4 rounded-xl bg-[#E6B34D] text-black font-bold text-lg hover:bg-[#D4A23C] transition-all transform hover:scale-105 shadow-lg shadow-[#E6B34D]/20"
            >
              See Pricing
            </a>
            
              href="#waitlist"
              className="px-8 py-4 rounded-xl bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Join Waitlist
            </a>
          </div>
        </section>

        {/* 3 Killer Differences */}
        <section className="py-16">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gradient-to-br from-[#E6B34D]/10 to-[#E6B34D]/5 border border-[#E6B34D]/20 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-[#E6B34D]/20 flex items-center justify-center mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Acquisition, Not Just Retention</h3>
              <p className="text-white/70 leading-relaxed">
                POS loyalty is <strong className="text-white">closed-loop</strong>. Shortlist is <strong className="text-[#E6B34D]">cross-promoted</strong> across top local businesses, apartments, and universities.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#E6B34D]/10 to-[#E6B34D]/5 border border-[#E6B34D]/20 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-[#E6B34D]/20 flex items-center justify-center mb-4">
                <span className="text-3xl">👑</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">VIP, Not Coupon Traffic</h3>
              <p className="text-white/70 leading-relaxed">
                Members are <strong className="text-white">hand-selected</strong> by businesses and communities. This isn't Groupon—it's <strong className="text-[#E6B34D]">quality over volume</strong>.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#E6B34D]/10 to-[#E6B34D]/5 border border-[#E6B34D]/20 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-[#E6B34D]/20 flex items-center justify-center mb-4">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Zone Density = Results</h3>
              <p className="text-white/70 leading-relaxed">
                We launch <strong className="text-white">zone-by-zone</strong> so every perk gets real distribution day one. No ghost town feeds.
              </p>
            </div>
          </div>
        </section>

        {/* The Problem with POS Loyalty */}
        <section className="py-16">
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 text-center">
              Why Toast & Square Loyalty Cost You Money
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-5xl mb-4">🔄</div>
                <h3 className="text-xl font-bold text-white mb-3">Same Faces, Lower Margin</h3>
                <p className="text-white/70">
                  You're giving <strong>discounts to people who'd pay full price</strong>. They already come every week—why reward that?
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">📉</div>
                <h3 className="text-xl font-bold text-white mb-3">Zero New Customers</h3>
                <p className="text-white/70">
                  POS loyalty <strong>only works on your existing customer list</strong>. It doesn't bring anyone new through your door.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">💸</div>
                <h3 className="text-xl font-bold text-white mb-3">Expensive Retention</h3>
                <p className="text-white/70">
                  You're <strong>paying to keep customers you already have</strong>. Wouldn't you rather pay to acquire new ones?
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                <strong className="text-white">Toast loyalty = retention.</strong> <strong className="text-[#E6B34D]">Shortlist = acquisition + retention.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            Toast/Square vs. Shortlist
          </h2>
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-white/70 font-medium"></th>
                  <th className="text-center px-6 py-4 text-white/70 font-medium">Toast/Square Loyalty</th>
                  <th className="text-center px-6 py-4 text-[#E6B34D] font-bold">Shortlist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Goal</td>
                  <td className="px-6 py-4 text-center text-white/70">Retain existing customers</td>
                  <td className="px-6 py-4 text-center text-white font-semibold">Acquire + retain VIP locals</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Distribution</td>
                  <td className="px-6 py-4 text-center text-white/70">Only your customer list</td>
                  <td className="px-6 py-4 text-center text-white font-semibold">Network feed + apartments/universities</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Customer Quality</td>
                  <td className="px-6 py-4 text-center text-white/70">No vetting</td>
                  <td className="px-6 py-4 text-center text-white font-semibold">Hand-selected + tiered access</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Redemption</td>
                  <td className="px-6 py-4 text-center text-white/70">POS-bound</td>
                  <td className="px-6 py-4 text-center text-white font-semibold">QR or manual; works with any POS</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">New Customers</td>
                  <td className="px-6 py-4 text-center text-white/70">❌ Zero</td>
                  <td className="px-6 py-4 text-center text-[#E6B34D] font-bold">✅ Every month</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <p className="text-white/70 text-lg max-w-3xl mx-auto">
              <strong className="text-white">You can keep using Toast for your POS.</strong> Shortlist sits on top and feeds you new, high-quality customers from the network.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6B34D] text-black font-bold flex items-center justify-center text-2xl mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Create Perks</h3>
              <p className="text-white/70">
                Set up exclusive offers in minutes. "Free appetizer," "20% off first visit," "2-for-1 drinks"—whatever brings people in.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6B34D] text-black font-bold flex items-center justify-center text-2xl mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Distribute Cards</h3>
              <p className="text-white/70">
                Hand Shortlist Cards to your best customers or we'll push them through our apartment/university partners.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6B34D] text-black font-bold flex items-center justify-center text-2xl mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Get New Visits</h3>
              <p className="text-white/70">
                Your perks appear in the private feed across the zone. New locals discover you and redeem via QR code.
              </p>
            </div>
          </div>
        </section>

        {/* ROI Calculator */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-8">
              See Your ROI
            </h2>
            <RoiCalculator />
            <p className="text-center text-white/60 text-sm mt-6">
              Most Shortlist businesses see 10-30 new visits per month within the first 90 days.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-white/70">
              $200 one-time setup fee, then choose your monthly plan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter */}
            <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <div className="text-5xl font-bold text-[#E6B34D] mb-2">$50</div>
                <p className="text-white/60 text-sm">per month</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70"><strong className="text-white">2 active perks</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70"><strong className="text-white">25 Shortlist Cards</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Network distribution</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Redemption tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Analytics dashboard</span>
                </li>
              </ul>
              <p className="text-white/50 text-xs text-center">Perfect for testing the waters</p>
            </div>

            {/* Growth (Popular) */}
            <div className="bg-gradient-to-br from-[#E6B34D]/20 to-[#E6B34D]/5 border-2 border-[#E6B34D] rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#E6B34D] text-black text-sm font-bold rounded-full">
                Most Popular
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
                <div className="text-5xl font-bold text-[#E6B34D] mb-2">$100</div>
                <p className="text-white/60 text-sm">per month</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70"><strong className="text-white">4 active perks</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70"><strong className="text-white">50 Shortlist Cards</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Priority network placement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Dedicated support</span>
                </li>
              </ul>
              <p className="text-white/70 text-xs text-center">Best for serious growth</p>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-5xl font-bold text-[#E6B34D] mb-2">$200</div>
                <p className="text-white/60 text-sm">per month</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70"><strong className="text-white">Unlimited perks</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70"><strong className="text-white">200 Shortlist Cards</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Featured placement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">Custom campaigns</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E6B34D] mt-1">✓</span>
                  <span className="text-white/70">White-glove onboarding</span>
                </li>
              </ul>
              <p className="text-white/50 text-xs text-center">For power users</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-white/60 text-sm">
              All plans include the $200 one-time setup fee covering system integration and initial card inventory.
            </p>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="py-16">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-[#E6B34D]/20 to-[#E6B34D]/5 border border-[#E6B34D]/30 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
              Ready to Bring New Customers?
            </h2>
            <p className="text-white/70 text-center mb-8 text-lg">
              Join the waitlist and we'll reach out to get you set up in your zone.
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                <p className="text-white/70">We'll reach out within 24-48 hours to get you onboarded.</p>
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
                <button
                  type="submit"
                  className="w-full px-8 py-4 rounded-xl bg-[#E6B34D] text-black font-bold text-lg hover:bg-[#D4A23C] transition-all shadow-lg"
                >
                  Join the Waitlist
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Questions? Let's Talk.
          </h2>
          <p className="text-xl text-white/70 mb-8">
            We're building this with local businesses. Let's chat about your zone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            
              href="mailto:hello@shortlistpass.com"
              className="px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
            >
              Email Us
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-[#E6B34D] mb-2">Shortlist</h3>
            <p className="text-white/60">Not another coupon app. A curated local network.</p>
          </div>
          <div className="text-center text-white/40 text-sm">
            © 2025 Shortlist. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
