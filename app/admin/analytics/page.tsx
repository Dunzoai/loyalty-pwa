'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DayData {
  date: string;
  formatted: string;
  count: number;
}

interface PerkData {
  id: string;
  title: string;
  count: number;
}

export default function AnalyticsPage() {
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [topPerks, setTopPerks] = useState<PerkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    highest_day: '',
    highest_count: 0,
    avg_per_day: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/analytics/weekly');
        if (!res.ok) throw new Error('Failed to fetch weekly analytics');
        
        const data = await res.json();
        setWeeklyData(data.days);
        setTopPerks(data.top_perks || []);
        setStats({
          total: data.total,
          highest_day: data.highest_day,
          highest_count: data.highest_count,
          avg_per_day: data.avg_per_day
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format date without date-fns
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Find the max value for scaling
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="bg-gray-900 shadow sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">Weekly Analytics</h1>
              <p className="text-sm text-gray-400 mt-1">
                Past 7 days performance
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors duration-150"
              >
                Back to Dashboard
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
              <div className="bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-md bg-blue-600 bg-opacity-75">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-xl font-semibold text-white">{stats.total}</div>
                    <div className="text-sm text-gray-400">Total Redemptions</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-md bg-indigo-600 bg-opacity-75">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-xl font-semibold text-white">
                      {stats.highest_day ? formatDate(stats.highest_day) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-400">Busiest Day</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-md bg-green-600 bg-opacity-75">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-xl font-semibold text-white">{stats.highest_count}</div>
                    <div className="text-sm text-gray-400">Max in a Day</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-md bg-purple-600 bg-opacity-75">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-xl font-semibold text-white">{stats.avg_per_day.toFixed(1)}</div>
                    <div className="text-sm text-gray-400">Daily Average</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-5 border-b border-gray-700">
                <h3 className="text-lg font-medium leading-6 text-white">
                  Redemption Activity This Week
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Daily redemption count over the past 7 days
                </p>
              </div>
              <div className="p-5">
                <div className="h-80">
                  <div className="flex h-64 items-end">
                    {weeklyData.map((day, index) => (
                      <div key={index} className="flex-1 mx-1 group relative">
                        <div className="flex flex-col items-center justify-end h-full">
                          <div 
                            className="w-full bg-blue-500 hover:bg-blue-400 transition-colors rounded-t"
                            style={{ 
                              height: day.count ? `${(day.count / maxCount) * 100}%` : '4px',
                            }}
                          ></div>
                          
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded z-10 whitespace-nowrap">
                            {day.count} redemptions
                          </div>
                        </div>
                        
                        {/* Date Label */}
                        <div className="text-center mt-2">
                          <div className="text-xs text-gray-400">
                            {day.formatted ? day.formatted : formatDate(day.date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Performing Perks */}
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-700">
                <h3 className="text-lg font-medium leading-6 text-white">
                  Top Performing Perks This Week
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Most popular offers by redemption count
                </p>
              </div>
              <div className="p-5">
                {topPerks.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <p className="mt-2">No perk data available for this period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topPerks.map((perk) => {
                      // Calculate percentage for bar width
                      const percentage = (perk.count / topPerks[0].count) * 100;
                      
                      return (
                        <div key={perk.id} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-gray-300 font-medium truncate max-w-[250px] md:max-w-[400px]">
                              {perk.title}
                            </div>
                            <div className="text-sm font-medium text-white ml-2">
                              {perk.count} redemptions
                            </div>
                          </div>
                          <div className="relative overflow-hidden bg-gray-700 rounded-full h-4">
                            <div 
                              className="h-4 rounded-full bg-green-500 group-hover:bg-green-400 transition-colors"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}