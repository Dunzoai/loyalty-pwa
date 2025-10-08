'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BusinessData {
  id: string;
  name: string;
  subscription_tier: 'starter' | 'growth' | 'premium';
  subscription_status: string;
  perks_allowed: number;
  perks_used: number;
  card_inventory: number;
  cards_purchased_total: number;
}

interface Perk {
  id: string;
  title: string;
  description?: string;
  status: 'live' | 'scheduled' | 'expired' | 'draft';
  tier: 'founding_shortlist' | 'shortlist' | 'all';
  redemption_count: number;
  last_redeemed?: string;
}

interface Redemption {
  id: string;
  perk_id: string;
  perk_title: string;
  user_name: string;
  user_email: string;
  redeemed_at: string;
  code: string;
}

interface ChartData {
  hour: string;
  count: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);
  const [analytics, setAnalytics] = useState({
    today_count: 0,
    week_count: 0,
    total_count: 0,
    most_popular: '',
    repeat_customers: 0
  });
  const [timeChartData, setTimeChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const businessRes = await fetch('/api/dashboard/business-info');
        if (businessRes.ok) {
          const bizData = await businessRes.json();
          setBusinessData(bizData);
        }
        
        const analyticsRes = await fetch('/api/dashboard/analytics');
        if (!analyticsRes.ok) throw new Error('Failed to fetch analytics');
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
        
        const redemptionsRes = await fetch('/api/dashboard/recent-redemptions');
        if (!redemptionsRes.ok) throw new Error('Failed to fetch redemptions');
        const redemptionsData = await redemptionsRes.json();
        setRecentRedemptions(redemptionsData);
        
        const perksRes = await fetch('/api/dashboard/perks');
        if (!perksRes.ok) throw new Error('Failed to fetch perks');
        const perksData = await perksRes.json();
        setPerks(perksData);
        
        const timeChartRes = await fetch('/api/dashboard/time-chart');
        if (!timeChartRes.ok) throw new Error('Failed to fetch time chart');
        const timeChartData = await timeChartRes.json();
        setTimeChartData(timeChartData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error instanceof Error ? error.message : 'An error occurred loading dashboard data');
        
        setAnalytics({
          today_count: 0,
          week_count: 0,
          total_count: 0,
          most_popular: '',
          repeat_customers: 0
        });
        setRecentRedemptions([]);
        setPerks([]);
        setTimeChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return "NOW";
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const truncateText = (text: string, length: number = 14) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const redemptionsByPerk = perks
    .sort((a, b) => b.redemption_count - a.redemption_count)
    .map(perk => ({
      id: perk.id,
      name: perk.title,
      count: perk.redemption_count,
      maxCount: Math.max(60, ...perks.map(p => p.redemption_count + 5)),
    }));

  const maxTimeCount = Math.max(...(timeChartData?.map(d => d.count) || [1]));

  const handleCardHover = (id: string) => {
    setActiveCard(id);
  };

  const retryLoading = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'premium': return 'bg-[#7C3AED]';
      case 'growth': return 'bg-[#3A86FF]';
      default: return 'bg-[#9AA4B2]';
    }
  };

  const tierLabels: Record<string, string> = {
    starter: 'Starter',
    growth: 'Growth',
    premium: 'Premium',
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#111827]/95 backdrop-blur border-b border-[#161B22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">Business Dashboard</h1>
              <p className="text-sm text-[#9AA4B2] mt-1">View your business performance and customer activity</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
              <Link
                href="/admin/perks"
                className="inline-flex items-center px-4 py-2 border border-[#161B22] shadow-sm text-sm font-medium rounded-xl text-[#F8FAFC] bg-[#0F1217] hover:bg-white/5 transition-colors"
              >
                Manage Perks
              </Link>
              <Link
                href="/admin/perks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold transition-colors"
              >
                + New Perk
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Business Status Card */}
        {businessData && (
          <div className="mb-6 bg-[#0F1217] rounded-[14px] p-4 border border-[#161B22] shadow-[0_6px_24px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold">{businessData.name}</h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(businessData.subscription_tier)} text-white capitalize`}>
                    {tierLabels[businessData.subscription_tier] || businessData.subscription_tier}
                  </span>
                  {businessData.subscription_status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#2CE8BD]/15 text-[#2CE8BD] border border-[#2CE8BD]/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2CE8BD]" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      {businessData.subscription_status}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#9AA4B2]">
                  <span>
                    Perks: <span className={`font-medium ${businessData.perks_used >= businessData.perks_allowed ? 'text-[#F59E0B]' : 'text-[#F8FAFC]'}`}>
                      {businessData.perks_used}/{businessData.perks_allowed === 999 ? '∞' : businessData.perks_allowed}
                    </span>
                  </span>
                  <span>
                    Card Inventory: <span className={`font-medium ${businessData.card_inventory < 10 ? 'text-[#F59E0B]' : 'text-[#F8FAFC]'}`}>
                      {businessData.card_inventory}
                    </span>
                  </span>
                  <span>
                    Cards Distributed: <span className="text-[#F8FAFC] font-medium">
                      {businessData.cards_purchased_total - businessData.card_inventory}
                    </span>
                  </span>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex gap-2">
                {businessData.perks_used >= businessData.perks_allowed && businessData.subscription_tier !== 'premium' && (
                  <button className="px-3 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm rounded-xl transition-colors">
                    Upgrade Plan
                  </button>
                )}
                {businessData.card_inventory < 10 && (
                  <button className="px-3 py-2 bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold text-sm rounded-xl transition-colors">
                    Buy Cards
                  </button>
                )}
              </div>
            </div>

            {/* Progress bars */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9AA4B2]">Perk Usage</span>
                  <span className="text-[#F8FAFC]">{businessData.perks_used}/{businessData.perks_allowed === 999 ? '∞' : businessData.perks_allowed}</span>
                </div>
                <div className="w-full bg-white/6 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${businessData.perks_used >= businessData.perks_allowed ? 'bg-[#F59E0B]' : 'bg-[#2CE8BD]'}`}
                    style={{width: businessData.perks_allowed === 999 ? '0%' : `${(businessData.perks_used / businessData.perks_allowed) * 100}%`}}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9AA4B2]">Card Inventory</span>
                  <span className="text-[#F8FAFC]">{businessData.card_inventory} available</span>
                </div>
                <div className="w-full bg-white/6 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${businessData.card_inventory < 10 ? 'bg-[#F59E0B]' : 'bg-[#3A86FF]'}`}
                    style={{width: `${Math.min((businessData.card_inventory / 50) * 100, 100)}%`}}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 mb-6 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444] rounded-[14px]">
            <div className="flex items-center">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">{error}</p>
            </div>
            <div className="mt-3">
              <button 
                onClick={retryLoading} 
                className="px-3 py-1 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-sm rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 mt-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 relative">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-[#161B22] rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-t-4 border-[#E6B34D] rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-[#9AA4B2]">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 mb-6">
              <div className="bg-[#0F1217] overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] transition-all hover:border-[#E6B34D]/30">
                <div className="p-4 md:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#3A86FF] rounded-xl p-2 md:p-3">
                      <svg className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 md:ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-xl md:text-2xl font-semibold">{analytics.today_count}</dd>
                        <dt className="text-xs md:text-sm font-medium text-[#9AA4B2]">Today's Redemptions</dt>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-[#111827] px-4 py-2 md:px-5 md:py-3">
                  <div className="text-xs md:text-sm">
                    <Link href="/admin/redemptions/today" className="font-medium text-[#3A86FF] hover:text-[#2C6FCC]">
                      View today's activity
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1217] overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] transition-all hover:border-[#E6B34D]/30">
                <div className="p-4 md:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#3A86FF] rounded-xl p-2 md:p-3">
                      <svg className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-3 md:ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-xl md:text-2xl font-semibold">{analytics.week_count}</dd>
                        <dt className="text-xs md:text-sm font-medium text-[#9AA4B2]">This Week's Total</dt>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-[#111827] px-4 py-2 md:px-5 md:py-3">
                  <div className="text-xs md:text-sm">
                    <Link href="/admin/analytics" className="font-medium text-[#3A86FF] hover:text-[#2C6FCC]">
                      View weekly trends
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1217] overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] transition-all hover:border-[#E6B34D]/30">
                <div className="p-4 md:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#2CE8BD] rounded-xl p-2 md:p-3">
                      <svg className="h-5 w-5 md:h-6 md:w-6 text-[#0B0F14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-3 md:ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-sm md:text-lg font-medium truncate max-w-[120px]">
                          {analytics.most_popular || "No data yet"}
                        </dd>
                        <dt className="text-xs md:text-sm font-medium text-[#9AA4B2]">Top Performing Perk</dt>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-[#111827] px-4 py-2 md:px-5 md:py-3">
                  <div className="text-xs md:text-sm">
                    <Link href="/admin/perks" className="font-medium text-[#3A86FF] hover:text-[#2C6FCC]">
                      View all perk stats
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1217] overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] transition-all hover:border-[#E6B34D]/30">
                <div className="p-4 md:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#7C3AED] rounded-xl p-2 md:p-3">
                      <svg className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 md:ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-xl md:text-2xl font-semibold">{analytics.repeat_customers}</dd>
                        <dt className="text-xs md:text-sm font-medium text-[#9AA4B2]">Returning Customers</dt>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-[#111827] px-4 py-2 md:px-5 md:py-3">
                  <div className="text-xs md:text-sm">
                    <Link href="/admin/customer/details" className="font-medium text-[#3A86FF] hover:text-[#2C6FCC]">
                      View customer details
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Feed and Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Live Activity */}
              <div className="bg-[#0F1217] shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22]">
                <div className="px-4 py-5 border-b border-[#161B22]">
                  <h3 className="text-lg font-medium leading-6">Live Activity</h3>
                  <p className="mt-1 text-sm text-[#9AA4B2]">
                    Recent customer redemptions
                  </p>
                </div>
                <div>
                  {recentRedemptions.length === 0 ? (
                    <div className="py-8 text-center text-[#9AA4B2]">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="mt-2">No recent redemptions</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#161B22]">
                      {recentRedemptions.map((redemption) => {
                        const timeAgo = getTimeAgo(redemption.redeemed_at);
                        const isNew = timeAgo === "NOW" || (timeAgo.includes("m") && parseInt(timeAgo) < 30);
                        const displayTitle = truncateText(redemption.perk_title);
                          
                        return (
                          <li 
                            key={redemption.id} 
                            className={`px-4 py-3 hover:bg-[#111827] transition-colors ${isNew ? 'bg-[#2CE8BD]/5' : ''}`}
                            onMouseEnter={() => handleCardHover(redemption.id)}
                            onMouseLeave={() => setActiveCard(null)}
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full bg-[#3A86FF]/20 flex items-center justify-center text-[#3A86FF] ${activeCard === redemption.id ? 'ring-2 ring-[#3A86FF]' : ''}`}>
                                  {redemption.user_name.substring(0, 2).toUpperCase()}
                                </div>
                              </div>
                              
                              <div className="ml-3 min-w-0 flex-1">
                                <div className="text-sm font-medium text-[#3A86FF] truncate group relative">
                                  {displayTitle}
                                  <span className="hidden group-hover:block absolute left-0 top-full mt-1 bg-[#111827] text-xs text-white py-1 px-2 rounded z-10 whitespace-nowrap border border-[#161B22]">
                                    {redemption.perk_title}
                                  </span>
                                </div>
                                
                                <div className="mt-1">
                                  <span className="text-xs text-[#9AA4B2]">{timeAgo}</span>
                                </div>
                              </div>
                              
                              <Link 
                                href={`/business/validate?code=${redemption.code}`}
                                className="ml-2 text-sm font-medium text-[#3A86FF] hover:text-[#2C6FCC]"
                              >
                                View
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="bg-[#111827] px-4 py-4 rounded-b-[14px]">
                    <Link
                      href="/admin/redemptions" 
                      className="w-full flex justify-center items-center px-4 py-2 border border-[#161B22] shadow-sm text-sm font-medium rounded-xl text-[#F8FAFC] bg-[#0F1217] hover:bg-white/5 transition-colors"
                    >
                      View all redemptions
                    </Link>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Time Chart */}
                <div className="bg-[#0F1217] shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] overflow-hidden">
                  <div className="px-4 py-5 border-b border-[#161B22]">
                    <h3 className="text-lg font-medium leading-6">Redemptions by Time of Day</h3>
                    <p className="mt-1 text-sm text-[#9AA4B2]">
                      When customers are using their perks
                    </p>
                  </div>
                  <div className="p-5">
                    {timeChartData.length === 0 || timeChartData.every(d => d.count === 0) ? (
                      <div className="h-60 w-full flex items-center justify-center text-[#9AA4B2]">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="mt-2">No time data available</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-60 w-full">
                        <div className="flex h-52 items-end">
                          {timeChartData.map((data, index) => (
                            <div key={index} className="flex-1 mx-1 group">
                              <div 
                                className="w-full bg-[#3A86FF] rounded-t group-hover:bg-[#2C6FCC] transition-all relative"
                                style={{ 
                                  height: `${Math.max((data.count / maxTimeCount) * 200, 4)}px`
                                }}
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-[#111827] text-white py-1 px-2 rounded text-xs whitespace-nowrap z-10 border border-[#161B22]">
                                  {data.count} redemptions
                                </div>
                              </div>
                              <div className="text-xs text-center text-[#9AA4B2] mt-2">
                                {data.hour}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Perk Performance Chart */}
                <div className="bg-[#0F1217] shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] overflow-hidden">
                  <div className="px-4 py-5 border-b border-[#161B22]">
                    <h3 className="text-lg font-medium leading-6">Top Performing Perks</h3>
                    <p className="mt-1 text-sm text-[#9AA4B2]">
                      Which offers are most popular with your customers
                    </p>
                  </div>
                  <div className="p-5">
                    {redemptionsByPerk.length === 0 ? (
                      <div className="h-40 w-full flex items-center justify-center text-[#9AA4B2]">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <p className="mt-2">No perk data available</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {redemptionsByPerk.map((perk) => (
                          <div 
                            key={perk.id} 
                            className="group"
                            onMouseEnter={() => handleCardHover(perk.id)}
                            onMouseLeave={() => setActiveCard(null)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium truncate max-w-[180px] md:max-w-[250px]">
                                {perk.name}
                              </div>
                              <div className="text-sm font-medium ml-2">
                                {perk.count} redemptions
                              </div>
                            </div>
                            <div className="relative overflow-hidden bg-white/6 rounded-full h-4">
                              <div 
                                className={`h-4 rounded-full transition-all duration-500 ${activeCard === perk.id ? 'bg-[#2C6FCC]' : 'bg-[#3A86FF]'}`}
                                style={{ 
                                  width: `${perk.count > 0 ? (perk.count / perk.maxCount) * 100 : 1}%`,
                                  transition: 'width 1s ease-in-out' 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#0F1217] shadow-[0_6px_24px_rgba(0,0,0,0.24)] rounded-[14px] border border-[#161B22] mt-6">
              <div className="px-4 py-5 border-b border-[#161B22]">
                <h3 className="text-lg font-medium leading-6">Quick Actions</h3>
                <p className="text-sm text-[#9AA4B2]">Common tasks for managing your business</p>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Link
                  href="/admin/redemptions/today" 
                  className="flex flex-col items-center p-4 border border-[#161B22] rounded-[14px] shadow-sm hover:bg-[#3A86FF]/10 hover:border-[#3A86FF] transition-colors group"
                >
                  <div className="flex-shrink-0 bg-[#3A86FF] rounded-xl p-3 mb-3 group-hover:bg-[#2C6FCC] transition-colors">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-md font-medium group-hover:text-[#3A86FF] transition-colors">Today's Activity</p>
                    <p className="mt-1 text-xs text-[#9AA4B2] hidden md:block">See today's redemptions</p>
                  </div>
                </Link>

                <Link
                  href="/admin/reports/export" 
                  className="flex flex-col items-center p-4 border border-[#161B22] rounded-[14px] shadow-sm hover:bg-[#2CE8BD]/10 hover:border-[#2CE8BD] transition-colors group"
                >
                  <div className="flex-shrink-0 bg-[#2CE8BD] rounded-xl p-3 mb-3 group-hover:bg-[#25C4A6] transition-colors">
                    <svg className="h-6 w-6 text-[#0B0F14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-md font-medium group-hover:text-[#2CE8BD] transition-colors">Export Data</p>
                    <p className="mt-1 text-xs text-[#9AA4B2] hidden md:block">Download reports & analytics</p>
                  </div>
                </Link>

                <Link
                  href="/admin/perks/new" 
                  className="flex flex-col items-center p-4 border border-transparent rounded-[14px] shadow-sm bg-[#E6B34D] hover:bg-[#C99934] transition-colors group"
                >
                  <div className="flex-shrink-0 bg-[#0B0F14]/20 rounded-xl p-3 mb-3 group-hover:bg-[#0B0F14]/30 transition-colors">
                    <svg className="h-6 w-6 text-[#0B0F14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-md font-medium text-[#0B0F14]">Create New Perk</p>
                    <p className="mt-1 text-xs text-[#0B0F14]/70 hidden md:block">Add new offer for customers</p>
                  </div>
                </Link>

                <Link
                  href="/admin/customer/details" 
                  className="flex flex-col items-center p-4 border border-[#161B22] rounded-[14px] shadow-sm hover:bg-[#7C3AED]/10 hover:border-[#7C3AED] transition-colors group"
                >
                  <div className="flex-shrink-0 bg-[#7C3AED] rounded-xl p-3 mb-3 group-hover:bg-[#6D28D9] transition-colors">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-md font-medium group-hover:text-[#7C3AED] transition-colors">Find Customer</p>
                    <p className="mt-1 text-xs text-[#9AA4B2] hidden md:block">Search customer records</p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile Floating CTA */}
      <Link
        href="/admin/perks/new"
        className="fixed bottom-20 right-4 sm:hidden rounded-full bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-5 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.24)]"
        aria-label="Create new perk"
      >
        + New Perk
      </Link>
    </div>
  );
}
