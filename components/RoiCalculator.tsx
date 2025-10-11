'use client';

import { useState } from 'react';

export function RoiCalculator() {
  const [newVisits, setNewVisits] = useState(15);
  const [aov, setAov] = useState(25);
  const [gm, setGm] = useState(65);
  const [plan, setPlan] = useState(100);

  const gross = newVisits * aov;
  const contrib = Math.round(gross * (gm / 100));
  const netProfit = contrib - plan;
  const roi = ((netProfit) / plan) * 100;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Calculate Your ROI</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="text-sm text-white/70 mb-2 block">New visits per month</span>
          <input
            type="number"
            value={newVisits}
            onChange={(e) => setNewVisits(+e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:border-[#E6B34D]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-2 block">Average order value ($)</span>
          <input
            type="number"
            value={aov}
            onChange={(e) => setAov(+e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:border-[#E6B34D]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-2 block">Gross margin (%)</span>
          <input
            type="number"
            value={gm}
            onChange={(e) => setGm(+e.target.value)}
            step="5"
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:border-[#E6B34D]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-2 block">Plan</span>
          <select
            value={plan}
            onChange={(e) => setPlan(+e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:border-[#E6B34D]"
          >
            <option value={50}>Starter - $50/mo</option>
            <option value={100}>Growth - $100/mo</option>
            <option value={200}>Pro - $200/mo</option>
          </select>
        </label>
      </div>
      <div className="rounded-xl bg-gradient-to-r from-[#E6B34D] to-[#D4A23C] px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-black/70 font-medium">Monthly Contribution</div>
            <div className="text-3xl font-bold text-black">${contrib}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-black/70 font-medium">ROI</div>
            <div className="text-3xl font-bold text-black">{roi > 0 ? '+' : ''}{roi.toFixed(0)}%</div>
          </div>
        </div>
        <div className="text-xs text-black/60 mt-2">
          Net profit: ${netProfit} per month
        </div>
      </div>
    </div>
  );
}
