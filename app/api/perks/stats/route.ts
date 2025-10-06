import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  try {
    // Get all perks
    const { data: perksData, error: perksError } = await supabase
      .from('Perks')
      .select('id, title, active, required_card_tier, starts_at, ends_at, business_id')
      .order('created_at', { ascending: false });
    
    if (perksError) throw perksError;
    
    // Get redemption counts for each perk
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .from('perk_redemptions')
      .select('id, perk_id, status, redeemed_at, created_at')
      .eq('status', 'redeemed');
    
    if (redemptionsError) throw redemptionsError;
    
    // Get counts for each perk
    const redemptionCounts = {};
    const lastRedemptionDates = {};
    const weekCounts = {};
    const monthCounts = {};
    
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setDate(now.getDate() - 30);
    
    redemptionsData.forEach(redemption => {
      const perkId = redemption.perk_id;
      const redemptionDate = new Date(redemption.redeemed_at || redemption.created_at);
      
      // Total counts
      redemptionCounts[perkId] = (redemptionCounts[perkId] || 0) + 1;
      
      // Last redemption date
      if (!lastRedemptionDates[perkId] || redemptionDate > new Date(lastRedemptionDates[perkId])) {
        lastRedemptionDates[perkId] = redemption.redeemed_at || redemption.created_at;
      }
      
      // Week counts
      if (redemptionDate >= weekAgo) {
        weekCounts[perkId] = (weekCounts[perkId] || 0) + 1;
      }
      
      // Month counts
      if (redemptionDate >= monthAgo) {
        monthCounts[perkId] = (monthCounts[perkId] || 0) + 1;
      }
    });
    
    // Combine data
    const perkStats = perksData.map(perk => {
      // Determine status
      let status: 'live' | 'scheduled' | 'expired' | 'draft' = 'draft';
      if (perk.active) {
        const now = new Date();
        const starts = perk.starts_at ? new Date(perk.starts_at) : null;
        const ends = perk.ends_at ? new Date(perk.ends_at) : null;
        
        if (!starts || starts <= now) {
          if (!ends || ends > now) {
            status = 'live';
          } else {
            status = 'expired';
          }
        } else {
          status = 'scheduled';
        }
      }
      
      return {
        id: perk.id,
        title: perk.title,
        status,
        tier: perk.required_card_tier,
        total_redemptions: redemptionCounts[perk.id] || 0,
        last_redeemed: lastRedemptionDates[perk.id] || null,
        week_redemptions: weekCounts[perk.id] || 0,
        month_redemptions: monthCounts[perk.id] || 0,
      };
    });
    
    // Sort by total redemptions (descending)
    perkStats.sort((a, b) => b.total_redemptions - a.total_redemptions);
    
    return NextResponse.json({
      perks: perkStats,
      total_perks: perkStats.length,
      active_perks: perkStats.filter(p => p.status === 'live').length,
      total_redemptions: redemptionsData.length
    });
  } catch (error) {
    console.error('Perks stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch perk statistics' },
      { status: 500 }
    );
  }
}