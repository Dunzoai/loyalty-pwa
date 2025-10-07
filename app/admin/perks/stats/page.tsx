'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PerkStat {
  id: string;
  title: string;
  status: 'live' | 'scheduled' | 'expired' | 'draft';
  tier: 'founder' | 'insider' | 'all';
  total_redemptions: number;
  last_redeemed: string | null;
  week_redemptions: number;
  month_redemptions: number;
}

export default function PerkStatsPage() {
  const [perks, setPerks] = useState<PerkStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_perks: 0,
    active_perks: 0,
    total_redemptions: 0
  });
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/perks/stats');
        if (!res.ok) throw new Error('Failed to fetch perk statistics');
        
        const data = await res.json();
        setPerks(data.perks);
        setStats({
          total_perks: data.total_perks,
          active_perks: data.active_perks,
          total_redemptions: data.total_redemptions
        });
      } catch (err) {
        console.error('Error fetching perk stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-900/40 text-green-300 border-green-800';
      case 'scheduled': return 'bg-blue-900/40 text-blue-300 border-blue-800';
      case 'expired': return 'bg-gray-900/40 text-gray-300 border-gray-700';
      case 'draft': return 'bg-yellow-900/40 text-yellow-300 border-yellow-800';
      default: return 'bg-gray-900/40 text-gray-300 border-gray-700';
    }
  };
  
  // Tier badge color helper
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'founder': return 'bg-purple-900/40 text-purple-300 border-purple-800';
      case 'insider': return 'bg-blue-900/40 text-blue-300 border-blue-800';
      case 'all': return 'bg-green-900/40 text-green-300 border-green-800';
      default: return 'bg-gray-900/40 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="bg-gray-900 shadow sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">Perk Statistics</h1>
              <p className="text-sm text-gray-400 mt-1">
                Performance metrics for all perks
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors duration-150 mr-2"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/admin/perks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors duration-150"
              >
                + New Perk
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 relative">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
            <button 
              className="mt-2 px-3 py-1 bg-red-900/40 hover:bg-red-800/60 text-sm rounded-md"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="text-3xl font-bold text-white">{stats.total_perks}</div>
                <div className="text-sm text-gray-400 mt-1">Total Perks</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="text-3xl font-bold text-white">{stats.active_perks}</div>
                <div className="text-sm text-gray-400 mt-1">Active Perks</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="text-3xl font-bold text-white">{stats.total_redemptions}</div>
                <div className="text-sm text-gray-400 mt-1">Total Redemptions</div>
              </div>
            </div>

            {/* Perks Table */}
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-700">
                <h3 className="text-lg font-medium leading-6 text-white">
                  All Perks
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Sorted by total redemptions
                </p>
              </div>
              
              {perks.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="mt-2">No perks found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Perk Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Tier
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last 7 Days
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last 30 Days
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last Redeemed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {perks.map((perk) => (
                        <tr key={perk.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{perk.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs leading-5 font-medium rounded-full border ${getStatusColor(perk.status)}`}>
                              {perk.status.charAt(0).toUpperCase() + perk.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs leading-5 font-medium rounded-full border ${getTierColor(perk.tier)}`}>
                              {perk.tier.charAt(0).toUpperCase() + perk.tier.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {perk.total_redemptions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {perk.week_redemptions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {perk.month_redemptions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {perk.last_redeemed ? formatDate(perk.last_redeemed) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}