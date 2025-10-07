'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

// Types
interface Perk {
  id: string;
  title: string;
  description: string | null;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  image_url: string | null;
  required_card_tier: string;
  active: boolean;
  ends_at: string | null;
  redemption_count?: number;
  saved_at?: string;
}

interface Redemption {
  id: string;
  perk: {
    id: string;
    title: string;
    business: {
      name: string;
    };
  };
  created_at: string;
  redeemed_at: string | null;
  code: string;
  status: 'pending' | 'redeemed' | 'expired';
}

interface Card {
  id: string;
  tier: string;
  claimed_at: string;
  nft_id: string | null;
  mint_address: string | null;
  nft_token_id: string | null;
}

interface UserProfile {
  name: string;
  email: string;
  created_at: string;
  city: string | null;
}

export default function CardholderDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [savedPerks, setSavedPerks] = useState<Perk[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  
  const [stats, setStats] = useState({
    totalRedemptions: 0,
    savedValue: 0,
    availablePerks: 0
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Get current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        if (!session?.user) {
          console.error('No user session found');
          throw new Error('Not authenticated');
        }
        
        const userEmail = session.user.email;
        const userId = session.user.id;
        
        console.log('User authenticated:', userEmail);
        
        // 2. Get user profile - lowercase table name
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('name, email, created_at, city')
          .eq('id', userId)
          .single();
          
        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }
        console.log('Profile data:', profileData);
        setProfile(profileData);
        
        // 3. Get user's card - using claimed_by_email instead of user_id
        const { data: cardData, error: cardError } = await supabase
          .from('cards')
          .select('id, tier, claimed_at, nft_id, mint_address, nft_token_id')
          .eq('claimed_by_email', userEmail)
          .maybeSingle();
          
        if (cardError) {
          console.error('Card fetch error:', cardError);
          throw cardError;
        }
        
        console.log('Card data:', cardData);
        setCard(cardData);
        
        // CRITICAL: No card = No perks access (NFT-gated system)
        if (!cardData) {
          console.log('User has no card - no perks available');
          setAvailablePerks([]);
          setSavedPerks([]);
          setRedemptions([]);
          setStats({
            totalRedemptions: 0,
            savedValue: 0,
            availablePerks: 0
          });
          setLoading(false);
          return; // Exit early - no card means no perks
        }
        
        const userTier = cardData.tier;
        
        // 4. Get available perks for user's tier - only for cardholders
        const now = new Date().toISOString();
        
        // Build the query - user MUST have a card to see any perks
        let perksQuery = supabase
          .from('perks')
          .select(`
            id, 
            title, 
            description, 
            image_url,
            required_card_tier, 
            active,
            ends_at,
            businesses:business_id (
              id, 
              name, 
              logo_url
            )
          `)
          .eq('active', true);
        
        // Get perks for user's specific tier OR perks marked for all cardholders
        // Note: 'all_tiers' would be for any cardholder, not for people without cards
        perksQuery = perksQuery.or(`required_card_tier.eq.${userTier},required_card_tier.eq.all_tiers`);
        
        // Add time filter and ordering
        const { data: perksData, error: perksError } = await perksQuery
          .or(`ends_at.is.null,ends_at.gt.${now}`)
          .order('created_at', { ascending: false });
          
        if (perksError) {
          console.error('Perks error:', perksError);
          console.error('Error details:', perksError);
          throw perksError;
        }
        
        console.log('Perks data count:', perksData?.length);
        
        // Transform data structure for easier rendering
        const transformedPerks = perksData.map((perk: any) => ({
          id: perk.id,
          title: perk.title,
          description: perk.description,
          image_url: perk.image_url,
          required_card_tier: perk.required_card_tier,
          active: perk.active,
          ends_at: perk.ends_at,
          business: {
            id: perk.businesses.id,
            name: perk.businesses.name,
            logo_url: perk.businesses.logo_url
          }
        }));
        
        setAvailablePerks(transformedPerks);
        
        // 5. Get user's saved perks
        const { data: savedPerksData, error: savedPerksError } = await supabase
          .from('saved_perks')
          .select(`
            id,
            saved_at,
            perks:perk_id (
              id, 
              title, 
              description, 
              image_url,
              required_card_tier, 
              active,
              ends_at,
              businesses:business_id (
                id, 
                name, 
                logo_url
              )
            )
          `)
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });
          
        if (savedPerksError) {
          console.error('Saved perks error:', savedPerksError);
        } else {
          // Transform and filter out any null perks (in case perk was deleted)
          const transformedSavedPerks = (savedPerksData || [])
            .filter(sp => sp.perks !== null)
            .map((sp: any) => ({
              id: sp.perks.id,
              title: sp.perks.title,
              description: sp.perks.description,
              image_url: sp.perks.image_url,
              required_card_tier: sp.perks.required_card_tier,
              active: sp.perks.active,
              ends_at: sp.perks.ends_at,
              business: {
                id: sp.perks.businesses.id,
                name: sp.perks.businesses.name,
                logo_url: sp.perks.businesses.logo_url
              },
              saved_at: sp.saved_at
            }));
          
          setSavedPerks(transformedSavedPerks);
        }
        
        // 6. Get user's redemption history - fixed table names to lowercase
        const { data: redemptionsData, error: redemptionsError } = await supabase
          .from('perk_redemptions')
          .select(`
            id, 
            created_at, 
            redeemed_at, 
            code, 
            status,
            perks:perk_id (
              id, 
              title,
              business_id,
              businesses:business_id (
                name
              )
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (redemptionsError) {
          console.error('Redemptions error:', redemptionsError);
          throw redemptionsError;
        }
        
        console.log('Redemptions count:', redemptionsData?.length);
        
        // Transform redemptions data
        const transformedRedemptions = redemptionsData.map((r: any) => ({
          id: r.id,
          created_at: r.created_at,
          redeemed_at: r.redeemed_at,
          code: r.code,
          status: r.status,
          perk: {
            id: r.perks.id,
            title: r.perks.title,
            business: {
              name: r.perks.businesses.name
            }
          }
        }));
        
        setRedemptions(transformedRedemptions);
        
        // 7. Calculate stats
        setStats({
          totalRedemptions: redemptionsData.length,
          savedValue: 0, // Would need actual values from perks to calculate
          availablePerks: transformedPerks.length
        });
        
      } catch (err) {
        console.error('Error details:', err);
        setError(err instanceof Error ? err.message : 'Error loading your dashboard');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);
  
  // Helper: Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Helper: Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'redeemed': return 'bg-green-900/40 text-green-300 border-green-800';
      case 'pending': return 'bg-blue-900/40 text-blue-300 border-blue-800';
      case 'expired': return 'bg-gray-900/40 text-gray-300 border-gray-700';
      default: return 'bg-gray-900/40 text-gray-300 border-gray-700';
    }
  };
  
  // Helper: Get card tier badge
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'founder':
        return { 
          label: 'Founder', 
          color: 'bg-purple-900/40 text-purple-300 border-purple-800',
          icon: '⭐️'
        };
      case 'insider':
        return { 
          label: 'Insider', 
          color: 'bg-blue-900/40 text-blue-300 border-blue-800',
          icon: '🔹'
        };
      case 'influencer':
        return { 
          label: 'Influencer', 
          color: 'bg-green-900/40 text-green-300 border-green-800',
          icon: '🌟'
        };
      default:
        return { 
          label: 'Member', 
          color: 'bg-gray-900/40 text-gray-300 border-gray-700',
          icon: '🎫'
        };
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 relative">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-400">Loading your perks...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-black text-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* User's card info */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold">Welcome, {profile?.name}</h1>
                {card && (
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border ${getTierBadge(card.tier).color}`}>
                      {getTierBadge(card.tier).icon} {getTierBadge(card.tier).label} Card
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      Member since {formatDate(card.claimed_at)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors duration-150"
                >
                  Browse All Perks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 overflow-hidden shadow-md rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400">Total Redemptions</dt>
                  <dd className="text-2xl font-semibold text-white">{stats.totalRedemptions}</dd>
                </dl>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 overflow-hidden shadow-md rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400">Value Unlocked</dt>
                  <dd className="text-2xl font-semibold text-white">$--</dd>
                </dl>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 overflow-hidden shadow-md rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400">Available Perks</dt>
                  <dd className="text-2xl font-semibold text-white">{stats.availablePerks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Perks Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Saved Perks</h2>
            <span className="text-sm text-gray-400">{savedPerks.length} saved</span>
          </div>
          
          {savedPerks.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-12 h-12 mx-auto mb-3 text-gray-500"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" 
                />
              </svg>
              <p className="text-gray-400">No saved perks yet.</p>
              <Link 
                href="/"
                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Browse Perks
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPerks.map((perk) => {
                const isExpired = perk.ends_at && new Date(perk.ends_at) < new Date();
                const userId = supabase.auth.getUser().then(u => u.data.user?.id);
                
                return (
                  <div 
                    key={perk.id} 
                    className={`bg-gray-800 rounded-lg shadow-md overflow-hidden ${
                      isExpired ? 'opacity-60' : ''
                    }`}
                  >
                    {perk.image_url && (
                      <div className="h-32 bg-gray-700">
                        <img 
                          src={perk.image_url} 
                          alt={perk.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm">{perk.title}</h3>
                        {isExpired && (
                          <span className="px-2 py-0.5 text-xs bg-red-900/40 text-red-300 border border-red-800 rounded">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{perk.business.name}</p>
                      {perk.description && (
                        <p className="text-xs text-gray-300 line-clamp-2 mb-3">
                          {perk.description}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {!isExpired && (
                          <Link
                            href={`/`}
                            className="flex-1 text-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                          >
                            View
                          </Link>
                        )}
                        <button
                          onClick={async () => {
                            // Get current user
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;
                            
                            // Remove from saved
                            const { error } = await supabase
                              .from('saved_perks')
                              .delete()
                              .eq('user_id', user.id)
                              .eq('perk_id', perk.id);
                            
                            if (!error) {
                              setSavedPerks(prev => prev.filter(p => p.id !== perk.id));
                            }
                          }}
                          className={`${
                            isExpired ? 'flex-1' : ''
                          } px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Activity</h2>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            {redemptions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-400">No redemption activity yet.</p>
                <Link 
                  href="/"
                  className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  Browse Perks
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Perk
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Business
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {redemptions.map((redemption) => (
                      <tr key={redemption.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{redemption.perk.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{redemption.perk.business.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {formatDate(redemption.redeemed_at || redemption.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs leading-5 font-medium rounded-full border ${getStatusColor(redemption.status)}`}>
                            {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            href={`/cardholder/redemptions/${redemption.id}`}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Card Details */}
        {card && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">My Membership Card</h2>
            
            <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTierBadge(card.tier).color} mb-2`}>
                      {getTierBadge(card.tier).icon} {getTierBadge(card.tier).label}
                    </div>
                    <h3 className="text-lg font-medium">{profile?.name}'s Card</h3>
                    <p className="text-gray-400 text-sm mt-1">Member since {formatDate(card.claimed_at)}</p>
                    
                    {card.nft_id && (
                      <div className="mt-2 text-xs text-gray-500">
                        NFT ID: {card.nft_id}
                      </div>
                    )}
                    
                    {card.mint_address && (
                      <div className="mt-2 text-xs text-gray-500">
                        Mint Address: {card.mint_address}
                      </div>
                    )}
                    
                    {card.nft_token_id && (
                      <div className="mt-2 text-xs text-gray-500">
                        NFT Token ID: {card.nft_token_id}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Membership Benefits */}
                <div className="mt-6 border-t border-gray-700 pt-4">
                  <h4 className="text-md font-medium mb-3">Membership Benefits</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <li className="flex items-center text-sm">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Access to exclusive {card.tier} perks
                    </li>
                    <li className="flex items-center text-sm">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Early access to new offers
                    </li>
                    <li className="flex items-center text-sm">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Special event invitations
                    </li>
                    <li className="flex items-center text-sm">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Digital verification with unique code
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}